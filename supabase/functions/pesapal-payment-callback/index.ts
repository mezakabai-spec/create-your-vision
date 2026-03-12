import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PesaPal redirects the user here after payment
    // We just redirect the user back to the app
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId");
    const merchantReference = url.searchParams.get("OrderMerchantReference");

    console.log(`PesaPal callback: trackingId=${orderTrackingId}, ref=${merchantReference}`);

    // Redirect user back to the app
    const appUrl = "https://aiinit.lovable.app";

    return new Response(
      `<html><head><meta http-equiv="refresh" content="0;url=${appUrl}"></head><body>Payment processed. Redirecting...</body></html>`,
      {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("PesaPal callback error:", error);
    return new Response("Error processing callback", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
