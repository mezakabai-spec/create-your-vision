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

async function getAuthToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });

  const data = await parseJsonResponse(res, "PesaPal auth token request");

  if (!data?.token) {
    throw new Error("PesaPal auth response did not include token");
  }

  return data.token;
}

async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  try {
    const listRes = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/GetIpnList`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (listRes.ok) {
      const ipns = await parseJsonResponse(listRes, "PesaPal IPN list request");
      if (Array.isArray(ipns)) {
        const existing = ipns.find((i: any) => i.url === ipnUrl && i.ipn_notification_type === "GET");
        if (existing?.ipn_id) return existing.ipn_id;
      }
    } else {
      const body = await listRes.text();
      console.warn("PesaPal GetIpnList failed, registering new IPN:", body.slice(0, 200));
    }
  } catch (error) {
    console.warn("PesaPal GetIpnList parse failed, registering new IPN:", error);
  }

  const res = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "GET",
    }),
  });

  const data = await parseJsonResponse(res, "PesaPal IPN registration");
  if (!data?.ipn_id) {
    throw new Error("PesaPal IPN registration response did not include ipn_id");
  }

  return data.ipn_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CONSUMER_KEY = Deno.env.get("PesaPal_Consumer_Key");
    const CONSUMER_SECRET = Deno.env.get("PesaPal_Consumer_Secret");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      return new Response(
        JSON.stringify({ error: "PesaPal credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, phoneNumber } = await req.json();
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 10) {
      return new Response(
        JSON.stringify({ error: "Minimum deposit is KES 10" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pesapalToken = await getAuthToken(CONSUMER_KEY, CONSUMER_SECRET);

    const ipnUrl = `${SUPABASE_URL}/functions/v1/pesapal-ipn`;
    const ipnId = await registerIPN(pesapalToken, ipnUrl);

    const merchantRef = `brbt-${user.id.slice(0, 8)}-${Date.now()}`;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    let formattedPhone = phoneNumber?.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "") || "";
    if (formattedPhone && !formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    const callbackUrl = `${SUPABASE_URL}/functions/v1/pesapal-payment-callback`;
    const orderPayload = {
      id: merchantRef,
      currency: "KES",
      amount: parsedAmount,
      description: "BronzeBet Deposit",
      callback_url: callbackUrl,
      redirect_mode: "",
      notification_id: ipnId,
      billing_address: {
        email_address: profile?.email || user.email || "",
        phone_number: formattedPhone,
        first_name: profile?.display_name || "Player",
        last_name: "",
        line_1: "",
        line_2: "",
        city: "",
        state: "",
        postal_code: "",
        zip_code: "",
        country_code: "KE",
      },
    };

    const orderRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pesapalToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await parseJsonResponse(orderRes, "PesaPal submit order request");

    if (!orderData?.order_tracking_id || !orderData?.redirect_url) {
      return new Response(
        JSON.stringify({ error: "Failed to create payment order", details: orderData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: pendingInsertError } = await supabase.from("pending_deposits").insert({
      user_id: user.id,
      order_tracking_id: orderData.order_tracking_id,
      merchant_reference: merchantRef,
      amount: parsedAmount,
      phone_number: formattedPhone,
      status: "pending",
    });

    if (pendingInsertError) {
      throw new Error(`Failed to store pending deposit: ${pendingInsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PesaPal order error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
