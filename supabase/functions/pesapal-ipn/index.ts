import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PESAPAL_BASE_URL = "https://pay.pesapal.com/v3";

const parseJsonResponse = async (res: Response, context: string) => {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const rawBody = await res.text();

  if (!res.ok) {
    throw new Error(`${context} failed (${res.status}): ${rawBody.slice(0, 300)}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`${context} returned non-JSON response: ${rawBody.slice(0, 300)}`);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`${context} returned invalid JSON: ${rawBody.slice(0, 300)}`);
  }
};

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

    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId");
    const merchantReference = url.searchParams.get("OrderMerchantReference");
    const notificationType = url.searchParams.get("OrderNotificationType") || "IPNCHANGE";

    console.log(
      `PesaPal IPN received: trackingId=${orderTrackingId}, ref=${merchantReference}, type=${notificationType}`
    );

    if (!orderTrackingId) {
      return new Response(
        JSON.stringify({
          orderNotificationType: notificationType,
          orderTrackingId: "",
          orderMerchantReference: merchantReference || "",
          status: 400,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authRes = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
    });

    const authData = await parseJsonResponse(authRes, "PesaPal auth token request (IPN)");
    const pesapalToken = authData?.token;

    if (!pesapalToken) {
      throw new Error("PesaPal auth response did not include token");
    }

    const statusRes = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(
        orderTrackingId
      )}`,
      {
        headers: { Authorization: `Bearer ${pesapalToken}`, Accept: "application/json" },
      }
    );

    const statusData = await parseJsonResponse(statusRes, "PesaPal transaction status request");
    const statusCode = Number(statusData?.status_code);
    console.log("Transaction status:", JSON.stringify(statusData));

    if (statusCode === 1) {
      const { data: deposit } = await supabase
        .from("pending_deposits")
        .select("*")
        .eq("order_tracking_id", orderTrackingId)
        .eq("status", "pending")
        .maybeSingle();

      if (deposit) {
        const { data: balance } = await supabase
          .from("balances")
          .select("amount")
          .eq("user_id", deposit.user_id)
          .maybeSingle();

        if (balance) {
          const newAmount = Number(balance.amount) + Number(deposit.amount);
          await supabase.from("balances").update({ amount: newAmount }).eq("user_id", deposit.user_id);
          console.log(`Credited KES ${deposit.amount} to user ${deposit.user_id}. New balance: ${newAmount}`);
        } else {
          await supabase.from("balances").insert({
            user_id: deposit.user_id,
            amount: Number(deposit.amount),
          });
          console.log(`Created balance with KES ${deposit.amount} for user ${deposit.user_id}`);
        }

        await supabase
          .from("pending_deposits")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", deposit.id);
      } else {
        console.log("No pending deposit found for tracking ID:", orderTrackingId);
      }
    } else if (statusCode === 2 || statusCode === 3) {
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ status: 500, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
