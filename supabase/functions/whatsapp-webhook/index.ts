import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Generic webhook receiver for incoming leads (WhatsApp / Wati / Interakt / Meta / Facebook Ads)
// Auth: pass ?api_key=xxx in the query string OR header `x-api-key`
// Body: any JSON. We try to extract common fields.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const pick = (obj: any, keys: string[]): any => {
  for (const k of keys) {
    const parts = k.split(".");
    let v: any = obj;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const normPhone = (p: any) => String(p ?? "").replace(/\D/g, "").slice(-10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get("x-api-key") ?? url.searchParams.get("api_key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing api_key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const keyHash = await sha256Hex(apiKey);
    const { data: keyRow } = await admin.from("api_keys").select("id, revoked").eq("key_hash", keyHash).maybeSingle();
    if (!keyRow || keyRow.revoked) {
      return new Response(JSON.stringify({ error: "Invalid api_key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const payload = await req.json().catch(() => ({}));
    const { data: ev } = await admin.from("webhook_events").insert({ source: pick(payload, ["source"]) ?? "whatsapp", payload }).select("id").single();

    const name = pick(payload, ["customer_name", "name", "full_name", "contact.name", "contacts.0.profile.name"]);
    const phone = normPhone(pick(payload, ["phone_number", "phone", "mobile", "contact.phone", "from", "contacts.0.wa_id"]));
    const message = pick(payload, ["message", "text", "messages.0.text.body"]);
    const policy = pick(payload, ["policy_type", "insurance_type"]) ?? "Motor";

    if (!name || !phone) {
      await admin.from("webhook_events").update({ processed: false, error: "Missing name or phone" }).eq("id", ev?.id);
      return new Response(JSON.stringify({ ok: true, event_id: ev?.id, lead_created: false, reason: "Missing name/phone" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pick first available area as fallback
    const { data: area } = await admin.from("areas").select("id").limit(1).maybeSingle();
    if (!area) {
      return new Response(JSON.stringify({ ok: false, error: "No area configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: lead, error: leadErr } = await admin.from("leads").insert({
      customer_name: String(name),
      phone_number: phone,
      policy_type: ["Life", "Health", "Motor"].includes(policy) ? policy : "Motor",
      area_id: area.id,
      lead_source: "WhatsApp API",
      notes: message ? String(message) : null,
    }).select("id").single();

    if (leadErr) {
      await admin.from("webhook_events").update({ error: leadErr.message }).eq("id", ev?.id);
      return new Response(JSON.stringify({ ok: false, error: leadErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("webhook_events").update({ processed: true, lead_id: lead.id }).eq("id", ev?.id);

    return new Response(JSON.stringify({ ok: true, lead_id: lead.id, event_id: ev?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
