// Sends a single renewal message via Twilio (if connected) or logs as queued/stub.
// Requires authenticated caller (JWT) OR cron secret. Caller must belong to renewal's company.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const renderTemplate = (body: string, vars: Record<string, string>) =>
  body
    .replaceAll("{customer_name}", vars.customer_name ?? "")
    .replaceAll("{policy_type}", vars.policy_type ?? "")
    .replaceAll("{expiry_date}", vars.expiry_date ?? "")
    .replaceAll("{premium_amount}", vars.premium_amount ?? "")
    .replaceAll("{agent_name}", vars.agent_name ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: accept either x-cron-secret (internal/cron use) or Bearer JWT (user-triggered)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");

    let callerCompanyId: string | null = null;
    let isInternal = false;

    if (expectedCron && cronSecret && cronSecret === expectedCron) {
      isInternal = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub as string;
      const adminTmp = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await adminTmp.from("profiles").select("company_id").eq("id", userId).single();
      callerCompanyId = profile?.company_id ?? null;
      if (!callerCompanyId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { renewal_id, channel = "whatsapp", template_id, campaign_id } = await req.json();
    if (!renewal_id) throw new Error("renewal_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: r } = await supabase.from("renewals").select("*").eq("id", renewal_id).single();
    if (!r) throw new Error("renewal not found");

    if (!isInternal && r.company_id !== callerCompanyId) {
      return new Response(JSON.stringify({ error: "Forbidden: renewal not in your company" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body_text = `Hi ${r.customer_name}, aapki ${r.policy_type} policy ${r.expiry_date} ko expire ho rahi hai. Renew karne ke liye reply karein.`;
    if (template_id) {
      const { data: t } = await supabase.from("renewal_templates").select("body_text,company_id").eq("id", template_id).single();
      if (t && t.company_id !== r.company_id) throw new Error("Template not in same company");
      if (t?.body_text) body_text = t.body_text;
    }
    const message = renderTemplate(body_text, {
      customer_name: r.customer_name ?? "",
      policy_type: r.policy_type ?? "",
      expiry_date: r.expiry_date ?? "",
      premium_amount: String(r.premium_amount ?? ""),
      agent_name: "Rocket",
    });

    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO = Deno.env.get("TWILIO_API_KEY");
    let status = "queued";
    let providerId: string | null = null;
    let error: string | null = null;

    if (LOVABLE && TWILIO && (channel === "whatsapp" || channel === "sms")) {
      const to = channel === "whatsapp" ? `whatsapp:${r.phone_number}` : r.phone_number;
      const params = new URLSearchParams({ To: to, Body: message });
      const from = channel === "whatsapp" ? Deno.env.get("TWILIO_FROM_WHATSAPP") : Deno.env.get("TWILIO_FROM_SMS");
      if (from) params.set("From", from);
      try {
        const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE}`,
            "X-Connection-Api-Key": TWILIO,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        const j = await res.json();
        if (!res.ok) { status = "failed"; error = JSON.stringify(j); }
        else { status = "sent"; providerId = j.sid; }
      } catch (e) {
        status = "failed"; error = String(e);
      }
    } else {
      status = "stub_logged";
    }

    await supabase.from("campaign_logs").insert({
      company_id: r.company_id, campaign_id: campaign_id ?? null, renewal_id: r.id,
      customer_id: r.customer_id, phone_number: r.phone_number, channel, status,
      provider_message_id: providerId, error, sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    if (status === "sent" || status === "stub_logged") {
      await supabase.from("renewals").update({ status: "contacted", last_contact_at: new Date().toISOString() }).eq("id", r.id);
    }

    return new Response(JSON.stringify({ ok: true, status, message, providerId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
