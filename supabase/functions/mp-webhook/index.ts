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

// ── Signature Validation ──────────────────────────────────────────
async function validateMPSignature(
  req: Request,
  dataId: string
): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("MP_WEBHOOK_SECRET not configured – skipping signature validation");
    return true; // graceful degradation in dev
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.error("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...valueParts] = part.trim().split("=");
    parts[key] = valueParts.join("=");
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) {
    console.error("Malformed x-signature header");
    return false;
  }

  // Build manifest string per MP docs: id:{data.id};request-id:{x-request-id};ts:{ts};
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHash !== v1) {
    console.error("Signature mismatch", { expected: v1, computed: computedHash });
    return false;
  }

  return true;
}

// ── Dynamic FX Rate ───────────────────────────────────────────────
async function fetchDynamicFxRate(): Promise<number> {
  try {
    // Fetch ARS/USDT from a public API (Binance P2P approximation via CoinGecko)
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ars"
    );
    if (response.ok) {
      const data = await response.json();
      const arsPerUsdt = data?.tether?.ars;
      if (arsPerUsdt && arsPerUsdt > 0) {
        const rate = 1 / arsPerUsdt; // USDT per ARS
        console.log(`Dynamic FX rate fetched: 1 ARS = ${rate} USDT (${arsPerUsdt} ARS/USDT)`);
        return rate;
      }
    }
    console.warn("FX API response invalid, using fallback");
  } catch (err) {
    console.warn("Failed to fetch dynamic FX rate, using fallback:", err);
  }
  // Fallback
  return 0.0008;
}

// ── Webhook Retry Logic ───────────────────────────────────────────
async function fireWebhooksWithRetry(
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

        // Attempt delivery with retries (3 attempts, exponential backoff)
        const maxAttempts = 3;
        let lastStatus = 0;
        let lastError: string | null = null;
        let delivered = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const webhookResponse = await fetch(webhook.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-DeltaPay-Signature": signatureHex,
              },
              body: JSON.stringify(payload),
            });

            lastStatus = webhookResponse.status;

            if (webhookResponse.ok) {
              delivered = true;
              console.log(`Webhook sent to ${webhook.url}: ${lastStatus} (attempt ${attempt})`);
              break;
            }

            lastError = `HTTP ${lastStatus}`;
            console.warn(`Webhook attempt ${attempt}/${maxAttempts} to ${webhook.url} failed: ${lastStatus}`);
          } catch (fetchErr) {
            lastError = String(fetchErr);
            console.warn(`Webhook attempt ${attempt}/${maxAttempts} to ${webhook.url} error: ${fetchErr}`);
          }

          // Exponential backoff: 1s, 4s, 9s
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
          }
        }

        // Calculate next retry time if not delivered
        const nextRetryAt = !delivered
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour later
          : null;

        // Log delivery
        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: payload.event,
          payload: payload,
          response_status: lastStatus || null,
          response_body: lastError,
          attempt_count: delivered ? 1 : maxAttempts,
          delivered_at: delivered ? new Date().toISOString() : null,
          next_retry_at: nextRetryAt,
        });
      } catch (webhookError) {
        console.error(`Error sending webhook to ${webhook.url}:`, webhookError);
      }
    }
  } catch (err) {
    console.error("Error firing webhooks:", err);
  }
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
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

    // ── 1. Validate MP signature ──
    const isValid = await validateMPSignature(req, webhookPayload.data?.id?.toString() || "");
    if (!isValid) {
      console.error("Invalid webhook signature – rejecting");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

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

    const externalReference = mpPayment.external_reference;

    if (!externalReference) {
      console.error("No external_reference in MP payment");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Check if payment is approved
    if (mpPayment.status !== "approved") {
      console.log(`MP payment status is ${mpPayment.status}, not processing confirmation`);
      await supabase.from("mp_events").insert({
        order_id: externalReference,
        mp_payment_id: mpPaymentId,
        event_type: `payment_${mpPayment.status}`,
        raw_payload: mpPayment,
      });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ── 2. Dynamic FX Rate ──
    const fxRate = await fetchDynamicFxRate();

    // Try to find if this is an order-based payment (ecommerce flow)
    const { data: orderCheck } = await supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("id", externalReference)
      .single();

    if (orderCheck) {
      console.log(`Processing order payment: ${externalReference}`);

      // ── Amount validation ──
      const expectedAmount = Number(orderCheck.total_amount);
      const receivedAmount = Number(mpPayment.transaction_amount);
      if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
        console.error(`Amount mismatch! Expected: ${expectedAmount}, Received: ${receivedAmount}`);
        await supabase.from("mp_events").insert({
          order_id: externalReference,
          mp_payment_id: mpPaymentId,
          event_type: "amount_mismatch",
          raw_payload: { expected: expectedAmount, received: receivedAmount, mp: mpPayment },
        });
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      await supabase.from("mp_events").insert({
        order_id: externalReference,
        mp_payment_id: mpPaymentId,
        event_type: "payment_approved",
        raw_payload: mpPayment,
      });

      if (orderCheck.status === "paid") {
        console.log("Order already paid, skipping");
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

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

      const { data: orderData } = await supabase
        .from("orders")
        .select("merchant_id, total_amount, product_snapshot_currency")
        .eq("id", externalReference)
        .single();

      if (orderData) {
        await fireWebhooksWithRetry(supabase, orderData.merchant_id, {
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

    const { data: internalPayment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status, merchant_id, currency, amount_local")
      .eq("id", internalPaymentId)
      .single();

    if (fetchError || !internalPayment) {
      console.error("Internal payment not found:", fetchError);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ── Amount validation for legacy flow ──
    const expectedLegacy = Number(internalPayment.amount_local);
    const receivedLegacy = Number(mpPayment.transaction_amount);
    if (Math.abs(expectedLegacy - receivedLegacy) > 0.01) {
      console.error(`Amount mismatch (legacy)! Expected: ${expectedLegacy}, Received: ${receivedLegacy}`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    if (internalPayment.status === "confirmed") {
      console.log("Payment already confirmed, skipping");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`Confirming payment ${internalPaymentId} with FX rate ${fxRate}`);

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

    await fireWebhooksWithRetry(supabase, internalPayment.merchant_id, {
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
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
