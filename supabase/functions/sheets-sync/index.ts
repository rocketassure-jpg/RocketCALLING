import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Imports leads from a publicly-published Google Sheet (CSV export). Admin-only.
// Required URL form: https://docs.google.com/spreadsheets/d/<id>/...
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    // Admin-only — prevents SSRF abuse by regular users
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { sheet_url } = await req.json();
    if (!sheet_url || typeof sheet_url !== "string") return new Response(JSON.stringify({ error: "sheet_url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // SSRF guard: only allow Google Sheets URLs
    let parsed: URL;
    try { parsed = new URL(sheet_url); } catch { return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    if (parsed.protocol !== "https:" || parsed.hostname !== "docs.google.com" || !parsed.pathname.startsWith("/spreadsheets/")) {
      return new Response(JSON.stringify({ error: "Only https://docs.google.com/spreadsheets/ URLs are allowed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Convert edit URL to CSV export URL — never fetch the raw user URL
    const m = sheet_url.match(/\/spreadsheets\/d\/([^\/]+)/);
    if (!m) return new Response(JSON.stringify({ error: "Could not extract spreadsheet id from URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const id = m[1];
    const gidM = sheet_url.match(/[?&#]gid=(\d+)/);
    const gid = gidM ? gidM[1] : "0";
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

    const r = await fetch(csvUrl);
    if (!r.ok) return new Response(JSON.stringify({ error: `Sheet fetch failed: ${r.status}. Make sure sheet is published or shared as 'Anyone with link'.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const csv = await r.text();

    const rows = csv.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) return new Response(JSON.stringify({ error: "Sheet empty" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const headers = rows[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const { data: areas } = await supabase.from("areas").select("id,name");
    const areaByName = new Map((areas ?? []).map((a) => [a.name.toLowerCase(), a.id]));

    let inserted = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => (obj[h] = (cols[idx] || "").trim()));
      if (!obj.customer_name || !obj.phone_number) { skipped++; continue; }
      let areaId = obj.area_id || areaByName.get((obj.area_name || obj.area || "").toLowerCase()) || areas?.[0]?.id;
      if (!areaId) { skipped++; continue; }
      const { error } = await supabase.from("leads").insert({
        customer_name: obj.customer_name,
        phone_number: obj.phone_number,
        area_id: areaId,
        policy_type: (obj.policy_type as any) || "Motor",
        registration_number: obj.registration_number || null,
        premium_amount: Number(obj.premium_amount || 0),
        lead_source: "GoogleSheet",
      });
      if (error) skipped++; else inserted++;
    }

    return new Response(JSON.stringify({ inserted, skipped, total: rows.length - 1 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
