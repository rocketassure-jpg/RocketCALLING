import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    // Role check — must be telecaller/manager/admin to send messages on company accounts
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId)
      .in("role", ["admin", "manager", "telecaller"]).maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { lead_id, phone_number, message } = await req.json();
    if (!phone_number || !message) return new Response(JSON.stringify({ error: "phone_number and message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // Basic input limits to prevent abuse
    if (typeof phone_number !== "string" || phone_number.length > 20) return new Response(JSON.stringify({ error: "Invalid phone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const msg = String(message).slice(0, 1000);

    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_FROM_NUMBER");
    let status = "sent";
    let errorMsg: string | null = null;

    if (!sid || !tok || !from) {
      status = "skipped";
      errorMsg = "Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)";
    } else {
      const auth = btoa(`${sid}:${tok}`);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: phone_number, From: from, Body: msg }),
      });
      if (!r.ok) { status = "failed"; errorMsg = await r.text(); }
    }

    await supabase.from("sms_logs").insert({ lead_id: lead_id || null, phone_number, message: msg, status, error: errorMsg, sent_by: userId });
    return new Response(JSON.stringify({ ok: status !== "failed", status, error: errorMsg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
