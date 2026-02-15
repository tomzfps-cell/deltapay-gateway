import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PayRequest {
  order_id: string;
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments: number;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

// ── Dynamic FX Rate ───────────────────────────────────────────────
async function fetchDynamicFxRate(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ars"
    );
    if (response.ok) {
      const data = await response.json();
      const arsPerUsdt = data?.tether?.ars;
      if (arsPerUsdt && arsPerUsdt > 0) {
        const rate = 1 / arsPerUsdt;
        console.log(`Dynamic FX rate: 1 ARS = ${rate} USDT (${arsPerUsdt} ARS/USDT)`);
        return rate;
      }
    }
    console.warn("FX API response invalid, using fallback");
  } catch (err) {
    console.warn("Failed to fetch dynamic FX rate:", err);
  }
  return 0.0008;
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
      return new Response(
        JSON.stringify({ success: false, error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: PayRequest = await req.json();
    console.log("Processing payment for order:", body.order_id);

    // Validate required fields
    if (!body.order_id || !body.token || !body.payment_method_id || !body.payer?.email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order and payment details
    const { data: orderData, error: orderError } = await supabase
      .rpc("get_order_for_checkout", { _order_id: body.order_id });

    if (orderError || !orderData?.success) {
      console.error("Order not found:", orderError || orderData?.error);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = orderData.order;
    const payment = orderData.payment;

    // Validate order status
    if (order.status === "paid") {
      console.log("Order already paid:", body.order_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          already_paid: true, 
          status: "approved",
          order_id: body.order_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status !== "pending_payment") {
      return new Response(
        JSON.stringify({ success: false, error: "Order cannot be paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment already confirmed
    if (payment?.status === "confirmed") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          already_paid: true, 
          status: "approved",
          order_id: body.order_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use payment's idempotency key
    const idempotencyKey = payment?.idempotency_key || crypto.randomUUID();

    // Prepare Mercado Pago payment request
    const mpPaymentBody = {
      token: body.token,
      transaction_amount: Number(order.total_amount),
      installments: body.installments || 1,
      payment_method_id: body.payment_method_id,
      issuer_id: body.issuer_id ? String(body.issuer_id) : undefined,
      payer: {
        email: body.payer.email,
        identification: body.payer.identification,
      },
      description: order.product_name,
      external_reference: body.order_id,
      statement_descriptor: "DELTAPAY",
    };

    console.log("Sending payment to MP:", JSON.stringify({
      transaction_amount: mpPaymentBody.transaction_amount,
      payment_method_id: mpPaymentBody.payment_method_id,
      external_reference: mpPaymentBody.external_reference,
    }));

    // Call Mercado Pago API
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpPaymentBody),
    });

    const mpResult = await mpResponse.json();
    console.log("MP response:", JSON.stringify({
      id: mpResult.id,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
    }));

    // Log the event for auditing
    await supabase.from("mp_events").insert({
      order_id: body.order_id,
      payment_id: payment?.id,
      mp_payment_id: mpResult.id?.toString(),
      event_type: "payment_created",
      raw_payload: mpResult,
    });

    // Amount validation: compare MP response against order total
    if (mpResponse.ok && mpResult.transaction_amount !== undefined) {
      const expectedAmount = Number(order.total_amount);
      const receivedAmount = Number(mpResult.transaction_amount);
      if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
        console.error(`Amount mismatch! Expected: ${expectedAmount}, Received: ${receivedAmount}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Payment amount mismatch",
            status: "rejected",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle MP response
    if (!mpResponse.ok) {
      console.error("MP payment failed:", mpResult);
      
      if (payment?.id) {
        await supabase
          .from("payments")
          .update({ 
            status: "failed", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", payment.id);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpResult.message || "Payment failed",
          status: "rejected",
          status_detail: mpResult.status_detail,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment with MP payment ID
    if (payment?.id) {
      await supabase
        .from("payments")
        .update({ 
          mp_preference_id: mpResult.id?.toString(),
          status: mpResult.status === "approved" ? "confirmed" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
    }

    // If payment is approved, confirm it immediately
    if (mpResult.status === "approved") {
      console.log("Payment approved, confirming order...");
      
      // Dynamic FX rate
      const fxRate = await fetchDynamicFxRate();
      
      const { data: confirmResult, error: confirmError } = await supabase
        .rpc("confirm_order_payment", {
          _order_id: body.order_id,
          _mp_payment_id: mpResult.id?.toString(),
          _fx_rate: fxRate,
        });

      if (confirmError) {
        console.error("Error confirming order:", confirmError);
      } else {
        console.log("Order confirmed:", confirmResult);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "approved",
          status_detail: mpResult.status_detail,
          mp_payment_id: mpResult.id,
          order_id: body.order_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return pending/in_process status
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: mpResult.status,
        status_detail: mpResult.status_detail,
        mp_payment_id: mpResult.id,
        order_id: body.order_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
