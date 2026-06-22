import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const log = { welcome: 0, cross_sell: 0, payment_due: 0, errors: [] as string[] };

  try {
    // 1) WELCOME — customers created in the last 24h with no welcome lifecycle event note
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: fresh } = await supabase
      .from("customers")
      .select("id,company_id,full_name,mobile,created_at")
      .gte("created_at", since);

    for (const c of fresh ?? []) {
      const { data: existing } = await supabase
        .from("customer_lifecycle_events")
        .select("id").eq("customer_id", c.id).ilike("notes", "Welcome message%").limit(1);
      if (existing && existing.length) continue;
      if (!c.mobile) continue;
      const msg = `Hi ${c.full_name}, welcome to Rocket Insurance! We're here to protect what matters to you. Reply HELP anytime.`;
      try {
        await supabase.functions.invoke("send-whatsapp", { body: { to: c.mobile, message: msg, company_id: c.company_id } });
        await supabase.from("customer_lifecycle_events").insert({
          company_id: c.company_id, customer_id: c.id, stage: "customer",
          source_ref: "automation:welcome", notes: "Welcome message sent",
        });
        log.welcome++;
      } catch (e) { log.errors.push(`welcome ${c.id}: ${(e as Error).message}`); }
    }

    // 2) CROSS-SELL — top suggestion per customer (score >= 80), not nudged in last 30 days
    const { data: opps } = await supabase
      .from("cross_sell_suggestions")
      .select("customer_id,company_id,missing_category,score,customers(full_name,mobile)")
      .gte("score", 80).order("score", { ascending: false }).limit(200);

    const seen = new Set<string>();
    for (const o of opps ?? []) {
      if (seen.has(o.customer_id)) continue;
      seen.add(o.customer_id);
      const cust: any = o.customers;
      if (!cust?.mobile) continue;
      const { data: recent } = await supabase
        .from("customer_lifecycle_events").select("id")
        .eq("customer_id", o.customer_id).eq("source_ref", `automation:cross_sell:${o.missing_category}`)
        .gte("occurred_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(1);
      if (recent && recent.length) continue;
      const msg = `Hi ${cust.full_name}, we noticed you don't have ${o.missing_category.replace("_"," ")} coverage. Want a quick quote? Reply YES.`;
      try {
        await supabase.functions.invoke("send-whatsapp", { body: { to: cust.mobile, message: msg, company_id: o.company_id } });
        await supabase.from("customer_lifecycle_events").insert({
          company_id: o.company_id, customer_id: o.customer_id, stage: "cross_sell",
          source_ref: `automation:cross_sell:${o.missing_category}`,
          notes: `Cross-sell nudge: ${o.missing_category}`,
        });
        log.cross_sell++;
      } catch (e) { log.errors.push(`cross_sell ${o.customer_id}: ${(e as Error).message}`); }
    }

    // 3) PAYMENT DUE — products expiring in next 7 days that don't yet have a renewal row
    const horizon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const { data: due } = await supabase
      .from("customer_products")
      .select("id,customer_id,company_id,product_name,policy_no,expiry_date,premium,customers(full_name,mobile)")
      .gte("expiry_date", today).lte("expiry_date", horizon);

    for (const p of due ?? []) {
      const cust: any = p.customers;
      if (!cust?.mobile) continue;
      const msg = `Hi ${cust.full_name}, your ${p.product_name || "policy"} (${p.policy_no || ""}) expires on ${p.expiry_date}. Premium due: ₹${p.premium || 0}. Reply RENEW.`;
      try {
        await supabase.functions.invoke("send-whatsapp", { body: { to: cust.mobile, message: msg, company_id: p.company_id } });
        log.payment_due++;
      } catch (e) { log.errors.push(`payment_due ${p.id}: ${(e as Error).message}`); }
    }

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
