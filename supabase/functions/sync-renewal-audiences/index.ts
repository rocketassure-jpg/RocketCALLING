// Daily cron — syncs renewal audiences to Meta Custom Audiences (SHA-256 hashed phones)
import { adminClient, corsHeaders, normalizePhone, sha256, chunk } from "../_shared/marketing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = cronSecret.length > 0 && providedSecret === cronSecret;
  const isService = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (!isCron && !isService) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const { data: configs } = await supabase
      .from("audience_sync_configs")
      .select("*, marketing_integrations(*)")
      .eq("enabled", true);

    const runs: any[] = [];
    for (const cfg of configs ?? []) {
      const today = new Date();
      const from = new Date(today); from.setDate(today.getDate() - (cfg.days_after_expiry ?? 0));
      const to = new Date(today); to.setDate(today.getDate() + (cfg.days_before_expiry ?? 30));

      let q = supabase.from("leads")
        .select("phone_number")
        .eq("company_id", cfg.company_id)
        .not("phone_number", "is", null)
        .gte("policy_expiry_date", from.toISOString().slice(0, 10))
        .lte("policy_expiry_date", to.toISOString().slice(0, 10));
      if (cfg.category && cfg.category !== "All") q = q.eq("policy_type", cfg.category);

      const { data: leads, error: leadsErr } = await q;
      const matched = leads?.length ?? 0;
      let sent = 0;
      let status: "success" | "partial" | "error" = "success";
      let message: string | null = null;

      if (leadsErr) {
        status = "error";
        message = leadsErr.message;
      } else if (matched === 0) {
        message = "No matching leads";
      } else {
        const integration = (cfg as any).marketing_integrations;
        if (!integration?.ad_account_id || !integration?.access_token || !cfg.meta_audience_id) {
          status = "error";
          message = "Missing Meta credentials or audience_id";
        } else {
          const hashed = await Promise.all((leads ?? []).map(async (l: any) => [await sha256(normalizePhone(l.phone_number))]));
          for (const batch of chunk(hashed, 10000)) {
            const payload = { schema: ["PHONE"], data: batch };
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${cfg.meta_audience_id}/users`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${integration.access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
              },
            );
            if (res.ok) sent += batch.length;
            else {
              status = sent > 0 ? "partial" : "error";
              const t = await res.text();
              message = t.slice(0, 300);
              break;
            }
          }
        }
      }

      await supabase.from("audience_sync_logs").insert({
        config_id: cfg.id,
        company_id: cfg.company_id,
        records_matched: matched,
        records_sent: sent,
        status,
        message,
      });
      runs.push({ config_id: cfg.id, matched, sent, status });
    }

    return new Response(JSON.stringify({ ok: true, runs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
