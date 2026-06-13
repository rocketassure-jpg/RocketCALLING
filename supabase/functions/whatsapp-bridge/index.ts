// Server-side proxy for the WhatsApp bridge. Holds BRIDGE_API_KEY as a
// server-only secret so it is never shipped in the client bundle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BRIDGE_URL = Deno.env.get("BRIDGE_URL") ?? "";
const BRIDGE_API_KEY = Deno.env.get("BRIDGE_API_KEY") ?? "";

const json = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BRIDGE_URL || !BRIDGE_API_KEY) {
      return json({ error: "Bridge not configured on server" }, 503);
    }

    // Auth: validate JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.slice("Bearer ".length);
    const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const uid = claimsRes.claims.sub as string;

    // Only admins/managers may use the bridge
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", uid);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "manager");
    const { data: prof } = await supabase
      .from("profiles").select("is_super_admin").eq("id", uid).maybeSingle();
    if (!allowed && !prof?.is_super_admin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (!["status", "qr", "send"].includes(action)) return json({ error: "Invalid action" }, 400);

    const headers: HeadersInit = {
      "x-api-key": BRIDGE_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json, image/*;q=0.9, */*;q=0.8",
    };

    if (action === "send") {
      const phone = String(body?.phone ?? "").replace(/\D/g, "");
      const message = String(body?.message ?? "");
      if (!phone || !message) return json({ error: "phone and message required" }, 400);
      const r = await fetch(`${BRIDGE_URL}/send`, {
        method: "POST", headers,
        body: JSON.stringify({ phone, number: phone, message, text: message }),
      });
      return json({ ok: r.ok, status: r.status }, r.ok ? 200 : 502);
    }

    // status or qr -> pass through
    const path = action === "qr" ? "/qr" : "/status";
    const r = await fetch(`${BRIDGE_URL}${path}`, { headers });
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = await r.json().catch(() => ({}));
      return json(j, r.status);
    }
    if (ct.includes("image")) {
      const buf = new Uint8Array(await r.arrayBuffer());
      const b64 = btoa(String.fromCharCode(...buf));
      return json({ qr: `data:${ct};base64,${b64}` }, r.status);
    }
    const txt = await r.text();
    return json({ raw: txt }, r.status);
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
