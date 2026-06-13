// Renewal reminder calculator: scans motor/health/life policies and creates
// service_request tasks for upcoming renewals at T-30, T-15, T-7, T-1 day windows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOWS = [30, 15, 7, 1];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const targetDates = WINDOWS.map((d) => {
      const t = new Date(today); t.setDate(t.getDate() + d);
      return { days: d, iso: t.toISOString().slice(0, 10) };
    });

    const sources = [
      { table: "motor_policies", type: "Motor" as const, dateCol: "policy_end_date" },
      { table: "health_policies", type: "Health" as const, dateCol: "policy_end_date" },
      { table: "life_policies", type: "Life" as const, dateCol: "next_premium_date" },
    ];

    let created = 0, scanned = 0;

    for (const src of sources) {
      for (const { days, iso } of targetDates) {
        const { data: policies, error } = await supabase
          .from(src.table)
          .select(`id, company_id, policy_number, customer_id, ${src.dateCol}`)
          .eq(src.dateCol, iso);
        if (error) { console.error(src.table, error.message); continue; }
        scanned += (policies?.length ?? 0);

        for (const p of policies ?? []) {
          // Skip duplicates: same policy + same due date already has a renewal request
          const { data: existing } = await supabase
            .from("service_requests")
            .select("id")
            .eq("policy_id", p.id)
            .eq("request_type", "renewal")
            .eq("due_date", iso)
            .limit(1);
          if (existing && existing.length) continue;

          const { error: insErr } = await supabase.from("service_requests").insert({
            company_id: p.company_id,
            customer_id: p.customer_id,
            policy_id: p.id,
            request_type: "renewal",
            status: "open",
            priority: days <= 7 ? "high" : days <= 15 ? "medium" : "low",
            due_date: iso,
            description: `${src.type} policy ${p.policy_number} renewal in ${days} day(s).`,
          });
          if (!insErr) created++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, scanned, created, run_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
