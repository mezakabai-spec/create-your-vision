import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PESAPAL_BASE_URL = "https://cybqa.pesapal.com/pesapalv3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CONSUMER_KEY = Deno.env.get("PesaPal_Consumer_Key")!;
    const CONSUMER_SECRET = Deno.env.get("PesaPal_Consumer_Secret")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // PesaPal sends IPN as GET with query params
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId");
    const merchantReference = url.searchParams.get("OrderMerchantReference");
    const notificationType = url.searchParams.get("OrderNotificationType");

    console.log(`PesaPal IPN received: trackingId=${orderTrackingId}, ref=${merchantReference}, type=${notificationType}`);

    if (!orderTrackingId) {
      return new Response(JSON.stringify({ orderNotificationType: "IPNCHANGE", orderTrackingId: "", orderMerchantReference: "", status: 400 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token to query transaction status
    const authRes = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
    });
    const authData = await authRes.json();
    const pesapalToken = authData.token;

    if (!pesapalToken) {
      console.error("Failed to get PesaPal token for status check");
      return new Response(JSON.stringify({ status: 500 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get transaction status
    const statusRes = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: { Authorization: `Bearer ${pesapalToken}`, Accept: "application/json" },
      }
    );
    const statusData = await statusRes.json();
    console.log("Transaction status:", JSON.stringify(statusData));

    // status_code: 0 = Invalid, 1 = Completed, 2 = Failed, 3 = Reversed
    if (statusData.status_code === 1) {
      // Payment completed - find pending deposit
      const { data: deposit } = await supabase
        .from("pending_deposits")
        .select("*")
        .eq("order_tracking_id", orderTrackingId)
        .eq("status", "pending")
        .single();

      if (deposit) {
        // Credit balance
        const { data: balance } = await supabase
          .from("balances")
          .select("amount")
          .eq("user_id", deposit.user_id)
          .single();

        if (balance) {
          const newAmount = Number(balance.amount) + Number(deposit.amount);
          await supabase
            .from("balances")
            .update({ amount: newAmount })
            .eq("user_id", deposit.user_id);
          console.log(`Credited KES ${deposit.amount} to user ${deposit.user_id}. New balance: ${newAmount}`);
        } else {
          // Create balance record
          await supabase.from("balances").insert({
            user_id: deposit.user_id,
            amount: Number(deposit.amount),
          });
          console.log(`Created balance with KES ${deposit.amount} for user ${deposit.user_id}`);
        }

        // Mark deposit as completed
        await supabase
          .from("pending_deposits")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", deposit.id);
      } else {
        console.log("No pending deposit found for tracking ID:", orderTrackingId);
      }
    } else if (statusData.status_code === 2 || statusData.status_code === 3) {
      // Failed or reversed
      await supabase
        .from("pending_deposits")
        .update({ status: "failed" })
        .eq("order_tracking_id", orderTrackingId);
    }

    return new Response(
      JSON.stringify({
        orderNotificationType: notificationType,
        orderTrackingId,
        orderMerchantReference: merchantReference,
        status: 200,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PesaPal IPN error:", error);
    return new Response(JSON.stringify({ status: 500 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
