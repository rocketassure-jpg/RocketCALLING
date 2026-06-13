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

    if (action === "seed_demo") {
      const companyName = (body.company_name as string) || "Wave Infocom";
      const companyCode = ((body.company_code as string) || "WAVEINFO").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const password = (body.password as string) || "Demo@12345";
      const emailDomain = (body.email_domain as string) || "waveinfocom.demo";
      const log: string[] = [];

      let { data: existing } = await admin.from("companies").select("*").eq("code", companyCode).maybeSingle();
      let company = existing;
      if (!company) {
        const { data: co, error } = await admin.from("companies").insert({ name: companyName, code: companyCode, plan: "custom", created_by: callerId, notes: "Demo seeded company" }).select().single();
        if (error) return new Response(JSON.stringify({ error: "company: " + error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        company = co;
        log.push(`Created company ${companyName} (${companyCode})`);
        const { data: mods } = await admin.from("modules").select("module_key,is_always_included");
        if (mods?.length) {
          await admin.from("company_subscriptions").insert(mods.map((m: any) => ({
            company_id: company.id, module_key: m.module_key,
            billing_cycle: m.is_always_included ? "lifetime" : "yearly",
            status: "active",
            end_date: m.is_always_included ? null : new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          })));
          log.push(`Activated ${mods.length} modules`);
        }
      } else log.push(`Company ${companyCode} already exists`);
      const cid = company.id;

      const users = [
        { email: `admin@${emailDomain}`, full_name: "Demo Admin", role: "admin" },
        { email: `manager@${emailDomain}`, full_name: "Demo Manager", role: "manager" },
        { email: `tc1@${emailDomain}`, full_name: "Telecaller One", role: "telecaller" },
        { email: `tc2@${emailDomain}`, full_name: "Telecaller Two", role: "telecaller" },
        { email: `subagent@${emailDomain}`, full_name: "Sub Agent One", role: "sub_agent" },
      ];
      const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const createdUsers: Record<string, string> = {};
      for (const u of users) {
        const found = existingUsers.users.find((x: any) => x.email === u.email);
        let uid = found?.id;
        if (!uid) {
          const { data: nu, error } = await admin.auth.admin.createUser({
            email: u.email, password, email_confirm: true,
            user_metadata: { full_name: u.full_name, company_code: companyCode, requested_role: u.role === "manager" ? "manager" : "telecaller" },
          });
          if (error) { log.push(`User ${u.email}: ${error.message}`); continue; }
          uid = nu.user!.id;
          log.push(`Created ${u.role} ${u.email}`);
        } else log.push(`User ${u.email} exists`);
        createdUsers[u.role] = uid!;
        await admin.from("profiles").update({ company_id: cid, full_name: u.full_name, is_approved: true, is_active: true }).eq("id", uid);
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("user_roles").insert({ user_id: uid, role: u.role });
      }
      const adminId = createdUsers["admin"];
      const managerId = createdUsers["manager"];
      const tcIds = users.filter((u) => u.role === "telecaller").map((u) => createdUsers[u.role]).filter(Boolean);

      if (managerId && tcIds.length) {
        for (const t of tcIds) await admin.from("profiles").update({ manager_id: managerId }).eq("id", t);
      }

      const areaNames = [`${companyCode}-Andheri`, `${companyCode}-Bandra`, `${companyCode}-Borivali`, `${companyCode}-Thane`, `${companyCode}-NaviMumbai`];
      const areaIds: string[] = [];
      for (const n of areaNames) {
        const { data: ex } = await admin.from("areas").select("id").eq("name", n).maybeSingle();
        if (ex) { areaIds.push(ex.id); continue; }
        const { data: a } = await admin.from("areas").insert({ name: n, company_id: cid }).select("id").single();
        if (a) areaIds.push(a.id);
      }
      log.push(`${areaIds.length} areas`);

      for (const t of tcIds) {
        await admin.from("telecaller_areas").delete().eq("telecaller_id", t);
        await admin.from("telecaller_areas").insert(areaIds.map((aid) => ({ telecaller_id: t, area_id: aid })));
      }

      const { data: branch } = await admin.from("branches").insert({ company_id: cid, name: "Mumbai HO", code: `${companyCode}-HO`, city: "Mumbai", state: "MH", is_active: true }).select("id").single();
      log.push(`Branch created`);

      const insurerData = [
        { name: "HDFC Ergo", short_code: "HDFE", category: "motor" },
        { name: "ICICI Lombard", short_code: "ICIL", category: "motor" },
        { name: "Star Health", short_code: "STAR", category: "health" },
        { name: "LIC India", short_code: "LIC", category: "life" },
        { name: "Bajaj Allianz", short_code: "BAJA", category: "motor" },
      ];
      const insIds: Record<string, string> = {};
      for (const i of insurerData) {
        const { data } = await admin.from("insurers").insert({ ...i, company_id: cid, is_active: true, tds_rate: 5, gst_applicable: true }).select("id,short_code").single();
        if (data) insIds[data.short_code] = data.id;
      }
      log.push(`${Object.keys(insIds).length} insurers`);

      const brokerData = [
        { name: "Apex Insurance Brokers", contact_person: "Rohit Sharma", mobile: "9876543210", email: "rohit@apex.demo" },
        { name: "Prime Risk Advisors", contact_person: "Neha Patel", mobile: "9876543211", email: "neha@prime.demo" },
        { name: "Shield Brokers Pvt Ltd", contact_person: "Amit Verma", mobile: "9876543212", email: "amit@shield.demo" },
      ];
      const brokerIds: string[] = [];
      for (const b of brokerData) {
        const { data } = await admin.from("brokers").insert({ ...b, company_id: cid, status: "active", agreement_start: "2025-01-01", agreement_end: "2026-12-31", created_by: callerId }).select("id").single();
        if (data) brokerIds.push(data.id);
      }
      log.push(`${brokerIds.length} brokers`);

      const today = new Date();
      const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
      const qEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0).toISOString().slice(0, 10);
      for (const bId of brokerIds) {
        for (const cat of ["motor", "health", "life"]) {
          const { data: tgt } = await admin.from("broker_targets").insert({
            company_id: cid, broker_id: bId, product_category: cat, period_type: "quarterly",
            period_start: qStart, period_end: qEnd, target_amount: 500000,
          }).select("id").single();
          if (tgt) {
            await admin.from("broker_slabs").insert([
              { company_id: cid, broker_id: bId, target_id: tgt.id, slab_min: 0, slab_max: 200000, commission_rate: 8, effective_from: qStart, effective_to: qEnd },
              { company_id: cid, broker_id: bId, target_id: tgt.id, slab_min: 200001, slab_max: 500000, commission_rate: 12, effective_from: qStart, effective_to: qEnd },
              { company_id: cid, broker_id: bId, target_id: tgt.id, slab_min: 500001, slab_max: null, commission_rate: 15, effective_from: qStart, effective_to: qEnd },
            ]);
          }
        }
      }
      log.push(`Broker targets + slabs`);

      const custData = [
        { full_name: "Rahul Mehta", mobile: "9000000001", email: "rahul@test.demo", city: "Mumbai", state: "MH", pincode: "400001", gender: "Male", dob: "1985-04-12", occupation: "Engineer", kyc_status: "verified" },
        { full_name: "Priya Singh", mobile: "9000000002", email: "priya@test.demo", city: "Mumbai", state: "MH", pincode: "400050", gender: "Female", dob: "1990-06-22", occupation: "Doctor", kyc_status: "verified" },
        { full_name: "Sanjay Gupta", mobile: "9000000003", email: "sanjay@test.demo", city: "Thane", state: "MH", pincode: "400601", gender: "Male", dob: "1978-11-03", occupation: "Business", kyc_status: "pending" },
        { full_name: "Anita Desai", mobile: "9000000004", email: "anita@test.demo", city: "Mumbai", state: "MH", pincode: "400053", gender: "Female", dob: "1982-02-18", occupation: "Teacher", kyc_status: "verified" },
        { full_name: "Vikram Joshi", mobile: "9000000005", email: "vikram@test.demo", city: "Navi Mumbai", state: "MH", pincode: "400706", gender: "Male", dob: "1975-09-30", occupation: "Architect", kyc_status: "verified" },
        { full_name: "Sneha Kulkarni", mobile: "9000000006", email: "sneha@test.demo", city: "Mumbai", state: "MH", pincode: "400025", gender: "Female", dob: "1992-12-05", occupation: "Designer", kyc_status: "verified" },
        { full_name: "Rajesh Iyer", mobile: "9000000007", email: "rajesh@test.demo", city: "Thane", state: "MH", pincode: "400602", gender: "Male", dob: "1980-07-14", occupation: "Manager", kyc_status: "verified" },
        { full_name: "Meera Reddy", mobile: "9000000008", email: "meera@test.demo", city: "Mumbai", state: "MH", pincode: "400028", gender: "Female", dob: "1988-03-21", occupation: "CA", kyc_status: "verified" },
      ];
      const custIds: string[] = [];
      for (const c of custData) {
        const { data } = await admin.from("customers").insert({ ...c, company_id: cid, agent_id: tcIds[0] ?? null, branch_id: branch?.id ?? null, created_by: adminId ?? callerId }).select("id").single();
        if (data) custIds.push(data.id);
      }
      log.push(`${custIds.length} customers`);

      const statuses = ["New", "Interested", "Follow-up", "Not Picked", "Quote Sent", "Premium Quoted", "Negotiation", "Converted"];
      const policyTypes = ["Motor", "Health", "Life"];
      const leadRows: any[] = [];
      for (let i = 0; i < 25; i++) {
        const pt = policyTypes[i % 3];
        const st = statuses[i % statuses.length];
        leadRows.push({
          company_id: cid, customer_name: `Demo Lead ${i + 1}`,
          phone_number: `98700${(10000 + i).toString()}`,
          area_id: areaIds[i % areaIds.length],
          policy_type: pt, status: st,
          assigned_telecaller: tcIds[i % Math.max(tcIds.length, 1)] ?? null,
          call_date: new Date(Date.now() + (i % 7) * 86400000).toISOString().slice(0, 10),
          premium_amount: 5000 + i * 1500,
          policy_expiry_date: new Date(Date.now() + (30 + i) * 86400000).toISOString().slice(0, 10),
          notes: `Auto-seeded ${pt} lead (${st})`,
        });
      }
      const { error: lErr } = await admin.from("leads").insert(leadRows);
      if (lErr) log.push(`leads ERR: ${lErr.message}`); else log.push(`${leadRows.length} leads`);

      const txnRows: any[] = [];
      for (let i = 0; i < 12; i++) {
        const cat = ["motor", "health", "life"][i % 3];
        const ins = insIds[cat === "motor" ? "HDFE" : cat === "health" ? "STAR" : "LIC"];
        const bId = brokerIds[i % brokerIds.length];
        const net = 8000 + i * 1200;
        const gst = Math.round(net * 0.18);
        const gross = net + gst;
        const comm = Math.round(net * 0.10);
        txnRows.push({
          company_id: cid, txn_date: new Date(Date.now() - i * 3 * 86400000).toISOString().slice(0, 10),
          policy_no: `DEMO-${companyCode}-${1000 + i}`, insurer_id: ins, broker_id: bId,
          client_name: custData[i % custData.length].full_name, client_phone: custData[i % custData.length].mobile,
          policy_type: cat, product_subtype: cat === "motor" ? "Private Car" : cat === "health" ? "Family Floater" : "Endowment",
          od_premium: cat === "motor" ? Math.round(net * 0.7) : 0,
          tp_premium: cat === "motor" ? Math.round(net * 0.3) : 0,
          net_premium: net, gst_amount: gst, gross_premium: gross,
          commission_rate: 10, commission_amount: comm, tds_amount: Math.round(comm * 0.05),
          agent_payout: Math.round(comm * 0.95), company_share: net - comm,
          status: i < 4 ? "received" : "expected",
          received_date: i < 4 ? new Date(Date.now() - i * 2 * 86400000).toISOString().slice(0, 10) : null,
          received_amount: i < 4 ? gross : 0,
          created_by: adminId ?? callerId,
        });
      }
      const { error: tErr } = await admin.from("policy_transactions").insert(txnRows);
      if (tErr) log.push(`txns ERR: ${tErr.message}`); else log.push(`${txnRows.length} policy txns`);

      const claimRows = [
        { company_id: cid, claim_number: `CL-${companyCode}-001`, policy_type: "motor", customer_id: custIds[0], insurer_id: insIds.HDFE, claim_type: "Own Damage", incident_date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10), claim_amount: 45000, status: "under_review", garage_name: "Maruti Service Andheri", branch_id: branch?.id, created_by: adminId ?? callerId },
        { company_id: cid, claim_number: `CL-${companyCode}-002`, policy_type: "health", customer_id: custIds[1], insurer_id: insIds.STAR, claim_type: "Cashless", incident_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), claim_amount: 120000, approved_amount: 110000, status: "approved", hospital_name: "Lilavati Hospital", branch_id: branch?.id, created_by: adminId ?? callerId },
        { company_id: cid, claim_number: `CL-${companyCode}-003`, policy_type: "motor", customer_id: custIds[2], insurer_id: insIds.ICIL, claim_type: "Third Party", incident_date: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), claim_amount: 75000, settled_amount: 72000, status: "settled", branch_id: branch?.id, created_by: adminId ?? callerId },
      ];
      const { error: cErr3 } = await admin.from("claims").insert(claimRows);
      if (cErr3) log.push(`claims ERR: ${cErr3.message}`); else log.push(`${claimRows.length} claims`);

      await admin.from("announcements").insert({
        title: `Welcome to ${companyName}`,
        message: `Your demo workspace is ready. Login with admin@${emailDomain} / ${password}`,
        type: "info", target: "specific_companies", target_company_ids: [cid], created_by: callerId,
      });

      await admin.from("super_admin_audit_log").insert({
        super_admin_id: callerId, action_type: "demo_seeded", target_company_id: cid,
        description: `Seeded demo data for ${companyName}`, new_value: { log },
      });

      return new Response(JSON.stringify({
        success: true, company, log,
        credentials: {
          admin: `admin@${emailDomain}`, manager: `manager@${emailDomain}`,
          telecallers: [`tc1@${emailDomain}`, `tc2@${emailDomain}`], sub_agent: `subagent@${emailDomain}`,
          password,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
