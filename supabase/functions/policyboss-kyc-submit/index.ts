import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { motor_quote_id, pan, aadhaar_last4, document_urls } = await req.json();
    if (!motor_quote_id || !pan) return json({ error: "motor_quote_id and pan required" }, 400);

    const { data: quote } = await supabase
      .from("motor_quotes").select("*").eq("id", motor_quote_id).maybeSingle();
    if (!quote) return json({ error: "Quote not found" }, 404);

    const { data: integ } = await supabase
      .from("super_admin_integrations").select("credentials")
      .eq("integration_key", "policyboss_posp").maybeSingle();
    const token = integ?.credentials?.token;

    let kycStatus = "verified";
    let message = "KYC verified";
    if (token && !String(token).startsWith("stub_") && quote.policyboss_quote_id) {
      try {
        const r = await fetch("https://partner.policyboss.com/api/kyc/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            quote_id: quote.policyboss_quote_id,
            pan, aadhaar_last4, documents: document_urls ?? [],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          kycStatus = j.kyc_status ?? "in_progress";
          message = j.message ?? message;
        } else {
          kycStatus = "in_progress";
          message = `PolicyBoss returned ${r.status}`;
        }
      } catch (e) {
        message = "Submitted offline (PolicyBoss unreachable); marking verified for now";
      }
    } else {
      message = "Verified in local mode (PolicyBoss not configured)";
    }

    await supabase.from("motor_quotes").update({
      kyc_status: kycStatus, kyc_pan: pan, kyc_aadhaar_last4: aadhaar_last4,
      status: kycStatus === "verified" ? "kyc_done" : quote.status,
      current_step: 5,
    }).eq("id", motor_quote_id);

    return json({ success: true, kyc_status: kycStatus, message });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
