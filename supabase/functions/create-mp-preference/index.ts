import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePreferenceRequest {
  payment_id: string;
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
        JSON.stringify({ success: false, error: "Mercado Pago not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_id }: CreatePreferenceRequest = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: "payment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating MP preference for payment: ${payment_id}`);

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, expires_at, snapshot_price, snapshot_currency, mp_preference_id, merchant_id, product_id")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payment status
    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: `Payment is ${payment.status}`, status: payment.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    if (now >= expiresAt) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if preference already exists
    if (payment.mp_preference_id) {
      console.log(`Reusing existing preference: ${payment.mp_preference_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          preference_id: payment.mp_preference_id,
          reused: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch product info if available
    let productName = "Producto DeltaPay";
    let productDescription = "";
    
    if (payment.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("name, description")
        .eq("id", payment.product_id)
        .single();
      
      if (product) {
        productName = product.name || productName;
        productDescription = product.description || "";
      }
    }

    // Calculate expiration for MP preference (same as payment expiration)
    const mpExpirationDate = expiresAt.toISOString();

    // Build back URLs - pointing back to the checkout
    const baseUrl = "https://id-preview--3258b436-3b5a-4432-bc12-f453ce3cfca5.lovable.app";
    const backUrl = `${baseUrl}/pay/${payment_id}`;

    // Build notification URL for webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    // Create Mercado Pago preference
    const preferencePayload = {
      items: [
        {
          id: payment.product_id || payment_id,
          title: productName,
          description: productDescription.substring(0, 256),
          quantity: 1,
          currency_id: payment.snapshot_currency || "ARS",
          unit_price: Number(payment.snapshot_price),
        },
      ],
      external_reference: payment_id,
      notification_url: webhookUrl,
      back_urls: {
        success: backUrl,
        pending: backUrl,
        failure: backUrl,
      },
      auto_return: "approved",
      expires: true,
      expiration_date_to: mpExpirationDate,
      metadata: {
        payment_id: payment_id,
        merchant_id: payment.merchant_id,
        product_id: payment.product_id,
      },
    };

    console.log("Creating MP preference with payload:", JSON.stringify(preferencePayload));

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP API error:", mpData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create Mercado Pago preference", details: mpData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("MP preference created:", mpData.id);

    // Save to mp_preferences table
    const { error: insertError } = await supabase
      .from("mp_preferences")
      .insert({
        payment_id: payment_id,
        preference_id: mpData.id,
        status: "pending",
        raw_payload: mpData,
      });

    if (insertError) {
      console.error("Error saving mp_preference:", insertError);
      // Continue anyway - preference was created
    }

    // Update payment with preference_id
    const { error: updateError } = await supabase
      .from("payments")
      .update({ mp_preference_id: mpData.id })
      .eq("id", payment_id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
