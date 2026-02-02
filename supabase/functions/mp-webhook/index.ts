import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");

    if (!mpAccessToken) {
      console.error("MP_ACCESS_TOKEN not configured");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const webhookPayload: MPWebhookPayload = await req.json();
    console.log("Received MP webhook:", JSON.stringify(webhookPayload));

    // We only care about payment events
    if (webhookPayload.type !== "payment") {
      console.log(`Ignoring webhook type: ${webhookPayload.type}`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const mpPaymentId = webhookPayload.data.id;

    // Fetch payment details from Mercado Pago
    console.log(`Fetching MP payment details for: ${mpPaymentId}`);
    const mpPaymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!mpPaymentResponse.ok) {
      console.error(`Failed to fetch MP payment: ${mpPaymentResponse.status}`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const mpPayment = await mpPaymentResponse.json();
    console.log("MP payment details:", JSON.stringify({
      id: mpPayment.id,
      status: mpPayment.status,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
    }));

    // Get internal reference (could be payment_id or order_id)
    const externalReference = mpPayment.external_reference;

    if (!externalReference) {
      console.error("No external_reference in MP payment");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Check if payment is approved
    if (mpPayment.status !== "approved") {
      console.log(`MP payment status is ${mpPayment.status}, not processing confirmation`);
      
      // Log the event anyway for auditing
      await supabase.from("mp_events").insert({
        order_id: externalReference,
        mp_payment_id: mpPaymentId,
        event_type: `payment_${mpPayment.status}`,
        raw_payload: mpPayment,
      });
      
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // FX rate - in production this would come from an external source
    const fxRate = 0.0008; // ~1250 ARS per USDT

    // Try to find if this is an order-based payment (ecommerce flow)
    const { data: orderCheck } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", externalReference)
      .single();

    if (orderCheck) {
      // This is an order-based payment (CardForm flow)
      console.log(`Processing order payment: ${externalReference}`);

      // Log the event
      await supabase.from("mp_events").insert({
        order_id: externalReference,
        mp_payment_id: mpPaymentId,
        event_type: "payment_approved",
        raw_payload: mpPayment,
      });

      // Idempotency: skip if already paid
      if (orderCheck.status === "paid") {
        console.log("Order already paid, skipping");
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // Confirm the order payment
      const { data: confirmResult, error: confirmError } = await supabase.rpc(
        "confirm_order_payment",
        {
          _order_id: externalReference,
          _mp_payment_id: mpPaymentId,
          _fx_rate: fxRate,
        }
      );

      if (confirmError) {
        console.error("Error confirming order payment:", confirmError);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      console.log("Order payment confirmed:", confirmResult);

      // Fire webhooks if configured (get merchant from order)
      const { data: orderData } = await supabase
        .from("orders")
        .select("merchant_id, total_amount, product_snapshot_currency")
        .eq("id", externalReference)
        .single();

      if (orderData) {
        await fireWebhooks(supabase, orderData.merchant_id, {
          event: "payment.confirmed",
          order_id: externalReference,
          data: {
            amount: orderData.total_amount,
            currency: orderData.product_snapshot_currency,
            mp_payment_id: mpPaymentId,
            confirmed_at: new Date().toISOString(),
          },
        });
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Legacy flow: payment_id based (Wallet Brick)
    const internalPaymentId = externalReference;
    console.log(`Processing legacy payment: ${internalPaymentId}`);

    // Update mp_preferences with the payment details
    const { error: mpPrefUpdateError } = await supabase
      .from("mp_preferences")
      .update({
        mp_payment_id: mpPaymentId,
        status: mpPayment.status,
        raw_payload: mpPayment,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", internalPaymentId);

    if (mpPrefUpdateError) {
      console.error("Error updating mp_preferences:", mpPrefUpdateError);
    }

    // Check current internal payment status
    const { data: internalPayment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status, merchant_id, currency")
      .eq("id", internalPaymentId)
      .single();

    if (fetchError || !internalPayment) {
      console.error("Internal payment not found:", fetchError);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Idempotency: skip if already confirmed
    if (internalPayment.status === "confirmed") {
      console.log("Payment already confirmed, skipping");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`Confirming payment ${internalPaymentId} with FX rate ${fxRate}`);

    // Call the existing confirm_payment function
    const { data: confirmResult, error: confirmError } = await supabase.rpc(
      "confirm_payment",
      {
        _payment_id: internalPaymentId,
        _fx_rate: fxRate,
      }
    );

    if (confirmError) {
      console.error("Error confirming payment:", confirmError);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("Payment confirmed successfully:", confirmResult);

    // Fire webhook to merchant if configured
    await fireWebhooks(supabase, internalPayment.merchant_id, {
      event: "payment.confirmed",
      payment_id: internalPaymentId,
      data: {
        amount: mpPayment.transaction_amount,
        currency: internalPayment.currency,
        mp_payment_id: mpPaymentId,
        confirmed_at: new Date().toISOString(),
      },
    });

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to MP to prevent retries for our errors
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

// Helper function to fire merchant webhooks
async function fireWebhooks(
  supabase: any,
  merchantId: string,
  payload: Record<string, any>
) {
  try {
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("is_active", true)
      .contains("events", ["payment.confirmed"]);

    if (!webhooks || webhooks.length === 0) {
      console.log("No webhooks configured for merchant");
      return;
    }

    for (const webhook of webhooks) {
      try {
        // Generate HMAC signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(webhook.secret_key),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(JSON.stringify(payload))
        );
        const signatureHex = Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Send webhook
        const webhookResponse = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-DeltaPay-Signature": signatureHex,
          },
          body: JSON.stringify(payload),
        });

        // Log delivery
        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: payload.event,
          payload: payload,
          response_status: webhookResponse.status,
          delivered_at: webhookResponse.ok ? new Date().toISOString() : null,
        });

        console.log(`Webhook sent to ${webhook.url}: ${webhookResponse.status}`);
      } catch (webhookError) {
        console.error(`Error sending webhook to ${webhook.url}:`, webhookError);
      }
    }
  } catch (err) {
    console.error("Error firing webhooks:", err);
  }
}
