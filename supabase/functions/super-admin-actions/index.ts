import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify super admin
    const { data: prof } = await admin.from("profiles").select("is_super_admin").eq("id", callerId).maybeSingle();
    if (!prof?.is_super_admin) {
      return new Response(JSON.stringify({ error: "Not a super admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "impersonate") {
      const targetUserId = body.target_user_id as string;
      const reason = (body.reason as string) || "Support";
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: target, error: uErr } = await admin.auth.admin.getUserById(targetUserId);
      if (uErr || !target?.user?.email) {
        return new Response(JSON.stringify({ error: "Target user not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const redirectTo = (body.redirect_to as string) || `${new URL(req.url).origin.replace(/\/functions.*$/, "")}/`;
      const { data: link, error: lErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: target.user.email,
        options: { redirectTo },
      });
      if (lErr) {
        return new Response(JSON.stringify({ error: lErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: tprof } = await admin.from("profiles").select("company_id, full_name").eq("id", targetUserId).maybeSingle();
      await admin.from("impersonation_sessions").insert({
        super_admin_id: callerId,
        target_user_id: targetUserId,
        target_company_id: tprof?.company_id ?? null,
        reason,
      });
      await admin.from("super_admin_audit_log").insert({
        super_admin_id: callerId,
        action_type: "impersonation_started",
        target_user_id: targetUserId,
        target_company_id: tprof?.company_id ?? null,
        description: `Impersonating ${tprof?.full_name ?? target.user.email}: ${reason}`,
      });

      return new Response(JSON.stringify({ action_link: link.properties?.action_link, target_email: target.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const email = body.email as string;
      if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (lErr) return new Response(JSON.stringify({ error: lErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("super_admin_audit_log").insert({
        super_admin_id: callerId,
        action_type: "user_reset_password",
        description: `Password reset link generated for ${email}`,
      });
      return new Response(JSON.stringify({ action_link: link.properties?.action_link }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_company") {
      const { name, code, plan, admin_email, admin_name, trial_days, max_users } = body;
      if (!name || !code) return new Response(JSON.stringify({ error: "name + code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const cleanCode = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const { data: co, error: cErr2 } = await admin.from("companies").insert({ name, code: cleanCode, plan: plan || "custom", created_by: callerId }).select().single();
      if (cErr2) return new Response(JSON.stringify({ error: cErr2.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: modules } = await admin.from("modules").select("*");
      let modKeys: string[] = [];
      if (plan && plan !== "custom") {
        const { data: tpl } = await admin.from("plan_templates").select("included_modules").eq("plan_name", plan).maybeSingle();
        modKeys = (tpl?.included_modules as string[]) ?? [];
      }
      const subs = (modules ?? []).filter((m: any) => m.is_always_included || modKeys.includes(m.module_key)).map((m: any) => ({
        company_id: co.id,
        module_key: m.module_key,
        billing_cycle: m.is_always_included ? "lifetime" : (trial_days ? "trial" : "monthly"),
        status: "active",
        end_date: m.is_always_included ? null : (trial_days ? new Date(Date.now() + trial_days * 86400000).toISOString().slice(0, 10) : null),
      }));
      if (subs.length) await admin.from("company_subscriptions").insert(subs);

      await admin.from("super_admin_audit_log").insert({
        super_admin_id: callerId,
        action_type: "company_created",
        target_company_id: co.id,
        description: `Created company ${name} (${cleanCode}) plan=${plan ?? "custom"}`,
        new_value: { name, code: cleanCode, plan, admin_email, admin_name, max_users },
      });

      return new Response(JSON.stringify({ company: co, signup_url: `${new URL(req.url).origin.replace(/\/functions.*$/, "")}/auth?company_code=${cleanCode}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "query_table") {
      const table = String(body.table || "");
      const limit = Math.min(Number(body.limit || 1000), 50000);
      const companyId = body.company_id as string | undefined;
      const ALLOWED = new Set([
        "companies","profiles","user_roles","leads","customers","enquiries","call_logs","dial_logs",
        "policy_transactions","motor_policies","health_policies","life_policies","claims","brokers",
        "broker_payouts","broker_targets","broker_slabs","broker_achievements","broker_company_mapping",
        "agent_payouts","commission_rates","insurers","branches","areas","tasks","expenses","complaints",
        "service_requests","rto_cases","vehicles","rc_register","permits","fitness_certificates","puc_records",
        "compliance_tracker","sms_logs","whatsapp_logs","webhook_events","audit_logs","super_admin_audit_log",
        "impersonation_sessions","announcements","feature_flags","global_settings","plan_templates",
        "modules","company_subscriptions","app_settings","training_materials","message_templates",
        "lead_notes","lead_statuses","crm_fields","customer_documents","claim_documents","break_logs",
        "ai_suggestions","premium_remittance","health_policy_members","life_nominees","life_premium_schedule",
        "telecaller_areas","role_permissions","agents_profile"
      ]);
      if (!ALLOWED.has(table)) {
        return new Response(JSON.stringify({ error: "Table not allowed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let q = admin.from(table).select("*", { count: "exact" }).limit(limit);
      if (companyId && companyId !== "__all") q = q.eq("company_id", companyId);
      const { data, error, count } = await q;
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("super_admin_audit_log").insert({
        super_admin_id: callerId, action_type: "data_export",
        target_company_id: companyId && companyId !== "__all" ? companyId : null,
        description: `Queried ${table} (${data?.length ?? 0} rows)`,
      });
      return new Response(JSON.stringify({ rows: data ?? [], count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
