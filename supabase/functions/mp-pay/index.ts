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

interface ErrorPayload {
  error: true;
  code: string;
  message: string;
  details?: unknown;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: string,
  message: string,
  options?: { details?: unknown; status?: number },
): Response {
  const { details, status = 400 } = options || {};
  const body: ErrorPayload = { error: true, code, message, details };
  return jsonResponse(body, status);
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

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");

    if (!mpAccessToken) {
      console.error("[mp-pay] MP_ACCESS_TOKEN not configured", {
        request_id: requestId,
      });
      return errorResponse(
        "missing_mp_access_token",
        "El proveedor de pagos no está configurado correctamente.",
        { status: 500, details: { request_id: requestId } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: PayRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[mp-pay] Invalid JSON body", {
        request_id: requestId,
        error: parseError,
      });
      return errorResponse(
        "invalid_json",
        "El cuerpo de la petición no es un JSON válido.",
        { status: 400, details: { request_id: requestId } },
      );
    }

    const safePayload = {
      order_id: body.order_id,
      payment_method_id: body.payment_method_id,
      issuer_id: body.issuer_id,
      installments: body.installments,
      payer: {
        email: body.payer?.email,
        identification: body.payer?.identification
          ? { type: body.payer.identification.type, number: "[REDACTED]" }
          : undefined,
      },
    };

    console.log("[mp-pay] Processing payment request", {
      request_id: requestId,
      payload: safePayload,
    });

    // Validaciones de payload antes de llamar a MP
    const validationErrors: string[] = [];

    if (!body.order_id) validationErrors.push("order_id es requerido");
    if (!body.token) validationErrors.push("token es requerido");
    if (!body.payment_method_id) validationErrors.push("payment_method_id es requerido");
    if (!body.payer?.email) validationErrors.push("payer.email es requerido");

    if (
      body.installments === undefined ||
      body.installments === null ||
      typeof body.installments !== "number" ||
      !Number.isFinite(body.installments)
    ) {
      validationErrors.push("installments debe ser un número");
    }

    if (
      !body.payer?.identification?.type ||
      !body.payer?.identification?.number
    ) {
      validationErrors.push(
        "payer.identification.type y payer.identification.number son requeridos",
      );
    }

    if (validationErrors.length > 0) {
      console.error("[mp-pay] Validation error", {
        request_id: requestId,
        payload: safePayload,
        validationErrors,
      });
      return errorResponse(
        "validation_error",
        "Los datos enviados no son válidos.",
        {
          status: 400,
          details: { request_id: requestId, validationErrors },
        },
      );
    }

    // Get order and payment details
    const { data: orderData, error: orderError } = await supabase
      .rpc("get_order_for_checkout", { _order_id: body.order_id });

    if (orderError || !orderData?.success) {
      console.error("[mp-pay] Order not found", {
        request_id: requestId,
        payload: safePayload,
        error: orderError || orderData?.error,
      });
      return errorResponse(
        "order_not_found",
        "No se encontró la orden.",
        { status: 404, details: { request_id: requestId } },
      );
    }

    const order = orderData.order;
    const payment = orderData.payment;

    if (
      typeof order?.total_amount !== "number" ||
      !Number.isFinite(order.total_amount)
    ) {
      console.error("[mp-pay] Invalid order amount", {
        request_id: requestId,
        order_id: body.order_id,
        total_amount: order?.total_amount,
      });
      return errorResponse(
        "invalid_order_amount",
        "El monto de la orden no es válido.",
        { status: 400, details: { request_id: requestId } },
      );
    }

    // Validate order status
    if (order.status === "paid") {
      console.log("[mp-pay] Order already paid", {
        request_id: requestId,
        order_id: body.order_id,
      });
      return jsonResponse({
        success: true,
        already_paid: true,
        status: "approved",
        order_id: body.order_id,
      });
    }

    if (order.status !== "pending_payment") {
      console.error("[mp-pay] Order cannot be paid", {
        request_id: requestId,
        order_id: body.order_id,
        status: order.status,
      });
      return errorResponse(
        "invalid_order_status",
        "La orden no puede ser pagada en su estado actual.",
        {
          status: 400,
          details: { request_id: requestId, order_status: order.status },
        },
      );
    }

    // Check if payment already confirmed
    if (payment?.status === "confirmed") {
      console.log("[mp-pay] Payment already confirmed", {
        request_id: requestId,
        order_id: body.order_id,
        payment_id: payment.id,
      });
      return jsonResponse({
        success: true,
        already_paid: true,
        status: "approved",
        order_id: body.order_id,
      });
    }

    // Use payment's idempotency key
    const idempotencyKey = payment?.idempotency_key || crypto.randomUUID();

    // Prepare Mercado Pago payment request
    const mpPaymentBody = {
      token: body.token,
      transaction_amount: Number(order.total_amount),
      installments: body.installments || 1,
      payment_method_id: body.payment_method_id,
      ...(body.issuer_id ? { issuer_id: String(body.issuer_id) } : {}),
      payer: {
        email: body.payer.email,
        identification: body.payer.identification,
      },
      description: order.product_name,
      external_reference: body.order_id,
      statement_descriptor: "DELTAPAY",
    };

    console.log("[mp-pay] Sending payment to MP", {
      request_id: requestId,
      transaction_amount: mpPaymentBody.transaction_amount,
      payment_method_id: mpPaymentBody.payment_method_id,
      external_reference: mpPaymentBody.external_reference,
    });

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
    console.log("[mp-pay] MP response summary", {
      request_id: requestId,
      id: mpResult.id,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      http_status: mpResponse.status,
    });

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
        console.error("[mp-pay] Amount mismatch!", {
          request_id: requestId,
          expectedAmount,
          receivedAmount,
        });
        return errorResponse(
          "payment_amount_mismatch",
          "El monto cobrado no coincide con el de la orden.",
          {
            status: 400,
            details: { request_id: requestId, expectedAmount, receivedAmount },
          },
        );
      }
    }

    // Handle MP response
    if (!mpResponse.ok) {
      console.error("[mp-pay] MP payment failed", {
        request_id: requestId,
        payload: safePayload,
        status: mpResponse.status,
        body: mpResult,
      });
      
      if (payment?.id) {
        await supabase
          .from("payments")
          .update({ 
            status: "failed", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", payment.id);
      }

      return errorResponse(
        "mp_payment_failed",
        mpResult.message || "El pago fue rechazado por Mercado Pago.",
        {
          status: 400,
          details: {
            request_id: requestId,
            status_detail: mpResult.status_detail,
            mp_status: mpResult.status,
          },
        },
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
      console.log("[mp-pay] Payment approved, confirming order...", {
        request_id: requestId,
        order_id: body.order_id,
      });
      
      // Dynamic FX rate
      const fxRate = await fetchDynamicFxRate();
      
      const { data: confirmResult, error: confirmError } = await supabase
        .rpc("confirm_order_payment", {
          _order_id: body.order_id,
          _mp_payment_id: mpResult.id?.toString(),
          _fx_rate: fxRate,
        });

      if (confirmError) {
        console.error("[mp-pay] Error confirming order", {
          request_id: requestId,
          order_id: body.order_id,
          error: confirmError,
        });
      } else {
        console.log("[mp-pay] Order confirmed", {
          request_id: requestId,
          order_id: body.order_id,
          result: confirmResult,
        });
      }

      return jsonResponse({
        success: true,
        status: "approved",
        status_detail: mpResult.status_detail,
        mp_payment_id: mpResult.id,
        order_id: body.order_id,
      });
    }

    // Return pending/in_process status
    return jsonResponse({
      success: true,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      mp_payment_id: mpResult.id,
      order_id: body.order_id,
    });

  } catch (error) {
    console.error("[mp-pay] Payment processing error", {
      request_id: requestId,
      error,
    });
    return errorResponse(
      "internal_error",
      "Ocurrió un error interno al procesar el pago.",
      { status: 500, details: { request_id: requestId } },
    );
  }
});
