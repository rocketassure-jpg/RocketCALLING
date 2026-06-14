// Marketing send dispatcher — authenticated; supports send-whatsapp, send-sms, trigger-voice, run-campaign, test-connection
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  adminClient,
  corsHeaders,
  sendWhatsApp,
  sendSMS,
  triggerVoiceCall,
  fillTemplate,
} from "../_shared/marketing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient();
    const userId = claimsData.claims.sub as string;
    const { data: callerProfile } = await supabase
      .from("profiles").select("company_id").eq("id", userId).single();
    const callerCompanyId = callerProfile?.company_id;
    if (!callerCompanyId) return jsonErr("Caller has no company", 403);

    const body = await req.json();
    const { action, ...params } = body;

    // Helper: assert a resource belongs to caller's company
    const assertCompany = async (table: string, id: string) => {
      const { data } = await supabase.from(table).select("company_id").eq("id", id).maybeSingle();
      if (!data || data.company_id !== callerCompanyId) {
        throw new Error("Forbidden: resource not in your company");
      }
    };

    switch (action) {
      case "send-whatsapp": {
        if (params.integration_id) await assertCompany("marketing_integrations", params.integration_id);
        if (params.template_id) await assertCompany("marketing_templates", params.template_id);
        if (params.campaign_log_id) await assertCompany("campaign_logs", params.campaign_log_id);

        const { data: integration } = await supabase
          .from("marketing_integrations").select("*").eq("id", params.integration_id).single();
        const { data: template } = await supabase
          .from("marketing_templates").select("*").eq("id", params.template_id).single();
        if (!integration || !template) return jsonErr("Integration or template missing", 400);

        const result = await sendWhatsApp({
          phone: params.phone,
          phoneNumberId: integration.wa_phone_number_id,
          accessToken: integration.access_token,
          templateName: template.wa_template_name,
          templateLanguage: template.wa_template_language || "en",
          components: params.components,
        });
        if (params.campaign_log_id) {
          await supabase.from("campaign_logs").update({
            status: result.success ? "sent" : "failed",
            sent_at: new Date().toISOString(),
            error: result.error ?? null,
            provider_message_id: result.messageId ?? null,
          }).eq("id", params.campaign_log_id);
        }
        return json(result);
      }

      case "send-sms": {
        if (params.integration_id) await assertCompany("marketing_integrations", params.integration_id);
        if (params.template_id) await assertCompany("marketing_templates", params.template_id);
        if (params.campaign_log_id) await assertCompany("campaign_logs", params.campaign_log_id);
        const { data: integration } = await supabase
          .from("marketing_integrations").select("*").eq("id", params.integration_id).single();
        const { data: template } = await supabase
          .from("marketing_templates").select("*").eq("id", params.template_id).single();
        if (!integration || !template) return jsonErr("Integration or template missing", 400);

        const message = fillTemplate(template.body_text, params.variables || {});
        const result = await sendSMS({
          phone: params.phone,
          apiKey: integration.sms_api_key,
          senderId: integration.sms_sender_id,
          message,
        });
        if (params.campaign_log_id) {
          await supabase.from("campaign_logs").update({
            status: result.success ? "sent" : "failed",
            sent_at: new Date().toISOString(),
            error: result.error ?? null,
          }).eq("id", params.campaign_log_id);
        }
        return json(result);
      }

      case "trigger-voice": {
        const { data: integration } = await supabase
          .from("marketing_integrations").select("*").eq("id", params.integration_id).single();
        if (!integration) return jsonErr("Integration missing", 400);

        const result = await triggerVoiceCall({
          phone: params.phone,
          apiKey: integration.voice_api_key,
          apiToken: integration.access_token,
          sid: integration.wa_waba_id,
          callerId: integration.voice_caller_id,
        });
        return json(result);
      }

      case "run-campaign": {
        const { data: campaign } = await supabase
          .from("renewal_campaigns").select("*").eq("id", params.campaign_id).single();
        if (!campaign) return jsonErr("Campaign missing", 404);

        let query = supabase.from("leads")
          .select("id,customer_name,phone_number,policy_type,policy_expiry_date,premium_amount,assigned_telecaller,city_village")
          .eq("company_id", campaign.company_id)
          .not("phone_number", "is", null);

        if (campaign.filter_expiry_from) query = query.gte("policy_expiry_date", campaign.filter_expiry_from);
        if (campaign.filter_expiry_to) query = query.lte("policy_expiry_date", campaign.filter_expiry_to);
        if (campaign.filter_policy_type && campaign.filter_policy_type !== "All")
          query = query.eq("policy_type", campaign.filter_policy_type);
        if (campaign.filter_city) query = query.eq("city_village", campaign.filter_city);
        if (campaign.filter_telecaller_id) query = query.eq("assigned_telecaller", campaign.filter_telecaller_id);

        const { data: targetLeads } = await query;
        const leads = targetLeads || [];

        await supabase.from("renewal_campaigns")
          .update({ total_targets: leads.length, status: "running" })
          .eq("id", params.campaign_id);

        const logRows = leads.map((l: any) => ({
          campaign_id: params.campaign_id,
          company_id: campaign.company_id,
          lead_id: l.id,
          customer_name: l.customer_name,
          phone_number: l.phone_number,
          channel: campaign.channel,
          status: "queued",
        }));

        if (logRows.length) await supabase.from("campaign_logs").insert(logRows);

        await supabase.from("renewal_campaigns")
          .update({ sent_count: leads.length, status: "completed" })
          .eq("id", params.campaign_id);

        return json({ success: true, total: leads.length });
      }

      case "test-connection": {
        const { data: integration } = await supabase
          .from("marketing_integrations").select("*").eq("id", params.integration_id).single();
        if (!integration) return jsonErr("Integration missing", 404);

        let testResult: { success: boolean; message: string } = { success: false, message: "Test not implemented for this platform" };

        try {
          if (integration.platform === "whatsapp" && integration.wa_phone_number_id && integration.access_token) {
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${integration.wa_phone_number_id}?fields=id,display_phone_number,status`,
              { headers: { Authorization: `Bearer ${integration.access_token}` } },
            );
            const data = await res.json();
            testResult = data?.id
              ? { success: true, message: `Connected: ${data.display_phone_number ?? data.id}` }
              : { success: false, message: data?.error?.message || "Connection failed" };
          } else if ((integration.platform === "meta" || integration.platform === "instagram" || integration.platform === "linkedin") && integration.page_id && integration.access_token) {
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${integration.page_id}?fields=id,name`,
              { headers: { Authorization: `Bearer ${integration.access_token}` } },
            );
            const data = await res.json();
            testResult = data?.id
              ? { success: true, message: `Connected: ${data.name ?? data.id}` }
              : { success: false, message: data?.error?.message || "Connection failed" };
          } else if (integration.platform === "sms") {
            testResult = integration.sms_api_key
              ? { success: true, message: "SMS provider key stored (live test on first send)" }
              : { success: false, message: "Missing SMS API key" };
          } else if (integration.platform === "voice") {
            testResult = integration.voice_api_key
              ? { success: true, message: "Voice provider key stored (live test on first call)" }
              : { success: false, message: "Missing voice API key" };
          } else if (integration.platform === "rcs") {
            testResult = integration.sms_api_key
              ? { success: true, message: "RCS provider key stored" }
              : { success: false, message: "Missing RCS API key" };
          }
        } catch (e) {
          testResult = { success: false, message: (e as Error).message };
        }

        await supabase.from("marketing_integrations").update({
          status: testResult.success ? "active" : "error",
          last_error: testResult.success ? null : testResult.message,
        }).eq("id", params.integration_id);

        return json(testResult);
      }

      default:
        return jsonErr("Unknown action", 400);
    }
  } catch (err) {
    return jsonErr((err as Error).message, 500);
  }
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const jsonErr = (msg: string, status: number) => json({ error: msg }, status);
