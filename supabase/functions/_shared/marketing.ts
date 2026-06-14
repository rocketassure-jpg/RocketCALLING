// Shared utilities for marketing automation edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export function normalizePhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(String(text ?? "").toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export async function sendWhatsApp(params: {
  phone: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  components?: unknown[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${params.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(params.phone),
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.templateLanguage || "en" },
          components: params.components ?? [],
        },
      }),
    });
    const data = await res.json();
    if (data?.messages?.[0]?.id) return { success: true, messageId: data.messages[0].id };
    return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function sendSMS(params: {
  phone: string;
  apiKey: string;
  senderId: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey: params.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: params.senderId,
        short_url: "0",
        mobiles: normalizePhone(params.phone),
        message: params.message,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return data?.type === "success" ? { success: true } : { success: false, error: data?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function triggerVoiceCall(params: {
  phone: string;
  apiKey: string;
  apiToken: string;
  sid: string;
  callerId: string;
}): Promise<{ success: boolean; callSid?: string; error?: string }> {
  try {
    const auth = btoa(`${params.apiKey}:${params.apiToken}`);
    const res = await fetch(`https://api.exotel.com/v1/Accounts/${params.sid}/Calls/connect`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: normalizePhone(params.phone),
        CallerId: params.callerId,
        Url: `http://my.exotel.com/exoml/start/your_app_id`,
      }).toString(),
    });
    const text = await res.text();
    return res.ok ? { success: true } : { success: false, error: text.slice(0, 200) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
