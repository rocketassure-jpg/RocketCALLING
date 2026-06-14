// WhatsApp marketing webhook — handles Meta WA replies, links to campaign_logs
import { adminClient, corsHeaders, normalizePhone } from "../_shared/marketing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Meta webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const expected = Deno.env.get("WA_VERIFY_TOKEN");
    if (expected && verifyToken === expected && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  try {
    const supabase = adminClient();
    const payload = await req.json().catch(() => ({}));

    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};
        const messages = value?.messages ?? [];
        const phoneNumberId = value?.metadata?.phone_number_id;

        // Find the matching integration → resolves company_id
        let companyId: string | null = null;
        if (phoneNumberId) {
          const { data: integration } = await supabase
            .from("marketing_integrations")
            .select("company_id")
            .eq("wa_phone_number_id", phoneNumberId)
            .maybeSingle();
          companyId = integration?.company_id ?? null;
        }

        for (const msg of messages) {
          const from = normalizePhone(msg?.from ?? "");
          const text = msg?.text?.body ?? msg?.button?.text ?? null;
          const messageType = msg?.type ?? "unknown";
          const wamid = msg?.id;

          // Find matching lead by phone
          let leadId: string | null = null;
          if (from) {
            const tail10 = from.slice(-10);
            const { data: lead } = await supabase
              .from("leads")
              .select("id")
              .ilike("phone_number", `%${tail10}`)
              .limit(1)
              .maybeSingle();
            leadId = lead?.id ?? null;
          }

          // Find latest matching campaign_log
          let campaignLogId: string | null = null;
          if (from) {
            const { data: log } = await supabase
              .from("campaign_logs")
              .select("id, campaign_id")
              .ilike("phone_number", `%${from.slice(-10)}`)
              .in("status", ["sent", "delivered"])
              .order("sent_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            campaignLogId = log?.id ?? null;
            if (log?.id) {
              await supabase.from("campaign_logs").update({
                status: "replied",
                replied_at: new Date().toISOString(),
                response_at: new Date().toISOString(),
              }).eq("id", log.id);
              if (log.campaign_id) {
                await supabase.rpc("noop").catch(() => {});
                // Best-effort increment via select+update
                const { data: c } = await supabase.from("renewal_campaigns")
                  .select("replied_count").eq("id", log.campaign_id).maybeSingle();
                await supabase.from("renewal_campaigns")
                  .update({ replied_count: (c?.replied_count ?? 0) + 1 })
                  .eq("id", log.campaign_id);
              }
            }
          }

          await supabase.from("wa_webhook_messages").insert({
            company_id: companyId,
            wa_message_id: wamid,
            from_number: from,
            message_type: messageType,
            message_text: text,
            lead_id: leadId,
            campaign_log_id: campaignLogId,
            direction: "inbound",
          }).select();
        }
      }
    }

    // Always 200 for WhatsApp
    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("wa-marketing-webhook error", (e as Error).message);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
