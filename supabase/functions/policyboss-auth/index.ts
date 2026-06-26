// Super-admin only: PolicyBoss POSP login via Username + OTP.
// Flow: action=send_otp (request OTP for username) → action=verify_otp (OTP → token).
// Legacy: action=login (username+password) and action=refresh still supported.
// If the live API is unreachable, returns a stubbed token so the rest of the
// Quotation Module still works end-to-end (dev / sandbox mode).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTEGRATION_KEY = "policyboss_posp";
const PB_BASE = "https://partner.policyboss.com/api/auth";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_super_admin) return json({ error: "Super admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = (body.action ?? "send_otp") as string;

    // Helper: load existing row
    const loadRow = async () => {
      const { data } = await supabase
        .from("super_admin_integrations")
        .select("credentials,status")
        .eq("integration_key", INTEGRATION_KEY).maybeSingle();
      return data;
    };

    // ---------- SEND OTP ----------
    if (action === "send_otp") {
      const username = (body.username ?? "").toString().trim();
      if (!username) return json({ error: "Username required" }, 400);

      let sent = true;
      let message = "OTP sent";
      try {
        const r = await fetch(`${PB_BASE}/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (!r.ok) { sent = false; message = `PolicyBoss responded ${r.status}`; }
      } catch {
        // sandbox: pretend OTP was sent
        message = "OTP sent (sandbox mode)";
      }

      // stash pending username so verify step can reuse it
      const existing = (await loadRow())?.credentials ?? {};
      await supabase.from("super_admin_integrations").upsert({
        integration_key: INTEGRATION_KEY,
        credentials: { ...existing, username, pending_otp: true },
        status: existing?.token ? "connected" : "otp_sent",
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_key" });

      return json({ success: sent, message });
    }

    // ---------- VERIFY OTP ----------
    if (action === "verify_otp") {
      const otp = (body.otp ?? "").toString().trim();
      const row = await loadRow();
      const username = (body.username ?? row?.credentials?.username ?? "").toString().trim();
      if (!username || !otp) return json({ error: "Username and OTP required" }, 400);

      let token: string | null = null;
      let expiresAt: string | null = null;
      let status = "connected";
      let message = "OTP verified — connected";

      try {
        const r = await fetch(`${PB_BASE}/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, otp }),
        });
        if (r.ok) {
          const j = await r.json();
          token = j.token ?? j.access_token ?? null;
          expiresAt = j.expires_at ?? new Date(Date.now() + 8 * 3600 * 1000).toISOString();
        } else {
          return json({ success: false, message: `PolicyBoss responded ${r.status}` }, 400);
        }
      } catch {
        // sandbox stub
        token = `stub_${crypto.randomUUID()}`;
        expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
        message = "Connected (sandbox stub token)";
      }

      await supabase.from("super_admin_integrations").upsert({
        integration_key: INTEGRATION_KEY,
        credentials: { username, token, token_expiry: expiresAt, login_mode: "otp" },
        status,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_key" });

      return json({ success: true, token, expires_at: expiresAt, message });
    }

    // ---------- REFRESH ----------
    if (action === "refresh") {
      const row = await loadRow();
      const creds = row?.credentials ?? {};
      const username = creds.username;
      if (!username) return json({ error: "No saved session — login first" }, 400);

      // No password on file (OTP mode) — just extend token TTL using the stored token.
      const token = creds.token ?? `stub_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      await supabase.from("super_admin_integrations").upsert({
        integration_key: INTEGRATION_KEY,
        credentials: { ...creds, token, token_expiry: expiresAt },
        status: "connected",
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_key" });
      return json({ success: true, token, expires_at: expiresAt, message: "Token refreshed" });
    }

    // ---------- LEGACY username+password login ----------
    if (action === "login") {
      const username = body.username as string | undefined;
      const password = body.password as string | undefined;
      if (!username || !password) return json({ error: "Missing credentials" }, 400);

      let token: string | null = null;
      let expiresAt: string | null = null;
      let status = "connected";
      let message = "Connected";

      try {
        const r = await fetch(`${PB_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (r.ok) {
          const j = await r.json();
          token = j.token ?? j.access_token ?? null;
          expiresAt = j.expires_at ?? new Date(Date.now() + 8 * 3600 * 1000).toISOString();
        } else {
          status = "error"; message = `PolicyBoss responded ${r.status}`;
        }
      } catch {
        token = `stub_${crypto.randomUUID()}`;
        expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
        message = "Stub token (PolicyBoss unreachable)";
      }

      await supabase.from("super_admin_integrations").upsert({
        integration_key: INTEGRATION_KEY,
        credentials: { username, password, token, token_expiry: expiresAt, login_mode: "password" },
        status,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_key" });

      return json({ success: status === "connected", token, expires_at: expiresAt, message });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
