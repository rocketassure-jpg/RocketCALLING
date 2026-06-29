// Daily cron: scans customer_products expiring in ~30 days and creates renewal leads.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const providedSecret = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const isCron = cronSecret.length > 0 && providedSecret === cronSecret;
    const isService = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
    if (!isCron && !isService) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const target = new Date(today); target.setDate(target.getDate() + 30);
    const iso = target.toISOString().slice(0, 10);

    const { data: products, error } = await supabase
      .from("customer_products")
      .select("id, company_id, customer_id, category, product_name, policy_no, end_date, premium, renewal_lead_created")
      .eq("end_date", iso)
      .eq("renewal_lead_created", false);

    if (error) throw error;

    let created = 0;
    for (const p of products ?? []) {
      const { data: cust } = await supabase
        .from("customers")
        .select("full_name, mobile, city")
        .eq("id", p.customer_id).maybeSingle();
      if (!cust) continue;

      const { data: lead, error: insErr } = await supabase.from("leads").insert({
        company_id: p.company_id,
        customer_id: p.customer_id,
        customer_name: cust.full_name,
        phone_number: cust.mobile,
        city_village: cust.city,
        policy_type: p.category,
        policy_number: p.policy_no,
        policy_expiry_date: p.end_date,
        premium_amount: p.premium,
        status: "New",
        source: "renewal_auto",
        notes: `Auto-renewal lead for ${p.product_name ?? p.category} expiring ${p.end_date}.`,
      }).select("id").single();

      if (!insErr && lead) {
        await supabase.from("customer_products")
          .update({ renewal_lead_created: true, renewal_lead_id: lead.id })
          .eq("id", p.id);
        created++;
      }
    }

    return new Response(JSON.stringify({ ok: true, scanned: products?.length ?? 0, created, run_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
