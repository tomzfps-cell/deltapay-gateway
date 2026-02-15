import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Running order/payment expiration job...");

    // Expire pending payments past their expires_at
    const { data: expiredPayments, error: paymentErr } = await supabase
      .from("payments")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .in("status", ["created", "pending"])
      .lt("expires_at", new Date().toISOString())
      .select("id, order_id");

    if (paymentErr) {
      console.error("Error expiring payments:", paymentErr);
    } else {
      console.log(`Expired ${expiredPayments?.length || 0} payments`);
    }

    // Expire orders whose payments are all expired
    if (expiredPayments && expiredPayments.length > 0) {
      const orderIds = [...new Set(
        expiredPayments
          .filter((p) => p.order_id)
          .map((p) => p.order_id)
      )];

      for (const orderId of orderIds) {
        // Only expire if order is still pending
        const { error: orderErr } = await supabase
          .from("orders")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", orderId!)
          .eq("status", "pending_payment");

        if (orderErr) {
          console.error(`Error expiring order ${orderId}:`, orderErr);
        }
      }

      console.log(`Checked ${orderIds.length} orders for expiration`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_payments: expiredPayments?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Expiration job error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
