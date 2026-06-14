// Runs a bulk renewal campaign: filters renewals, fans out send-renewal-message per row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { company_id, name, channel, template_id, expiry_from, expiry_to, policy_type, city } = body;
    if (!company_id) throw new Error("company_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let q = supabase.from("renewals").select("id").eq("company_id", company_id)
      .gte("expiry_date", expiry_from).lte("expiry_date", expiry_to).eq("status", "pending");
    if (policy_type && policy_type !== "all") q = q.eq("policy_type", policy_type);
    const { data: rs, error: rerr } = await q;
    if (rerr) throw rerr;

    const { data: campaign, error: cerr } = await supabase.from("renewal_campaigns").insert({
      company_id, name, channel, template_id: template_id || null,
      filter: { expiry_from, expiry_to, policy_type, city },
      status: "running", sent_count: 0,
    }).select().single();
    if (cerr) throw cerr;

    let sent = 0;
    for (const r of rs ?? []) {
      try {
        await supabase.functions.invoke("send-renewal-message", {
          body: { renewal_id: r.id, channel, template_id, campaign_id: campaign.id },
        });
        sent++;
      } catch (e) { console.error("send failed", r.id, e); }
    }

    await supabase.from("renewal_campaigns").update({ sent_count: sent, status: "completed" }).eq("id", campaign.id);

    return new Response(JSON.stringify({ ok: true, campaign_id: campaign.id, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
