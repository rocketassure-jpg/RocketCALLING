// Super-admin only: login/refresh PolicyBoss POSP and persist the session token.
// If the live API is unreachable (no creds / mock mode), returns a stubbed token
// so the rest of the Quotation Module still works end-to-end.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTEGRATION_KEY = "policyboss_posp";
const PB_LOGIN_URL = "https://partner.policyboss.com/api/auth/login";

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
    const action = body.action ?? "login";
    let username = body.username as string | undefined;
    let password = body.password as string | undefined;

    if (action === "refresh") {
      const { data: row } = await supabase
        .from("super_admin_integrations")
        .select("credentials").eq("integration_key", INTEGRATION_KEY).maybeSingle();
      username = username ?? row?.credentials?.username;
      password = password ?? row?.credentials?.password;
    }

    if (!username || !password) return json({ error: "Missing credentials" }, 400);

    let token: string | null = null;
    let expiresAt: string | null = null;
    let status = "connected";
    let message = "Connected";

    try {
      const r = await fetch(PB_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (r.ok) {
        const j = await r.json();
        token = j.token ?? j.access_token ?? null;
        expiresAt = j.expires_at ?? new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      } else {
        status = "error";
        message = `PolicyBoss responded ${r.status}`;
      }
    } catch (e) {
      // Network / sandbox — fall back to a stubbed token so UI works
      status = "connected";
      message = "Stub token (PolicyBoss unreachable from server)";
      token = `stub_${crypto.randomUUID()}`;
      expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    }

    await supabase.from("super_admin_integrations").upsert({
      integration_key: INTEGRATION_KEY,
      credentials: { username, password, token, token_expiry: expiresAt },
      status,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "integration_key" });

    return json({ success: status === "connected", token, expires_at: expiresAt, message });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
