import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PESAPAL_BASE_URL = Deno.env.get("PESAPAL_BASE_URL") || "https://pay.pesapal.com/v3";

async function getAuthToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("Failed to get PesaPal auth token");
  return data.token;
}

async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  // First check if IPN already registered
  const listRes = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/GetIpnList`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const ipns = await listRes.json();
  
  if (Array.isArray(ipns)) {
    const existing = ipns.find((i: any) => i.url === ipnUrl && i.ipn_notification_type === "GET");
    if (existing) return existing.ipn_id;
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
  const data = await res.json();
  if (!data.ipn_id) throw new Error("Failed to register IPN URL");
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

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, phoneNumber } = await req.json();

    if (!amount || amount < 10) {
      return new Response(
        JSON.stringify({ error: "Minimum deposit is KES 10" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PesaPal auth token
    const pesapalToken = await getAuthToken(CONSUMER_KEY, CONSUMER_SECRET);

    // Register IPN callback URL
    const ipnUrl = `${SUPABASE_URL}/functions/v1/pesapal-ipn`;
    const ipnId = await registerIPN(pesapalToken, ipnUrl);

    // Generate unique merchant reference
    const merchantRef = `brbt-${user.id.slice(0, 8)}-${Date.now()}`;

    // Get user email from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", user.id)
      .single();

    // Format phone for PesaPal (254XXXXXXXXX)
    let formattedPhone = phoneNumber?.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "") || "";
    if (formattedPhone && !formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Submit order
    const callbackUrl = `${SUPABASE_URL}/functions/v1/pesapal-payment-callback`;
    const orderPayload = {
      id: merchantRef,
      currency: "KES",
      amount: Number(amount),
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

    console.log("Submitting PesaPal order:", JSON.stringify(orderPayload));

    const orderRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pesapalToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderRes.json();
    console.log("PesaPal order response:", JSON.stringify(orderData));

    if (!orderData.order_tracking_id || !orderData.redirect_url) {
      return new Response(
        JSON.stringify({ error: "Failed to create payment order", details: orderData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save pending deposit
    await supabase.from("pending_deposits").insert({
      user_id: user.id,
      order_tracking_id: orderData.order_tracking_id,
      merchant_reference: merchantRef,
      amount: Number(amount),
      phone_number: formattedPhone,
      status: "pending",
    });

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
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
