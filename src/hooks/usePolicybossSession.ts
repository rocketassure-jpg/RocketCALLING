import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type State = {
  loading: boolean;
  connected: boolean;
  token: string | null;
  expiresAt: string | null;
  status: string;
  username: string | null;
  loginMode: "otp" | "password" | null;
};

const INITIAL: State = {
  loading: true, connected: false, token: null, expiresAt: null,
  status: "disconnected", username: null, loginMode: null,
};

export const usePolicybossSession = () => {
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const { data } = await (supabase as any)
      .from("super_admin_integrations")
      .select("credentials,status,last_synced_at")
      .eq("integration_key", "policyboss_posp")
      .maybeSingle();
    const creds = data?.credentials ?? {};
    const expiresAt = creds.token_expiry ?? null;
    const expired = expiresAt ? new Date(expiresAt) < new Date() : true;
    setState({
      loading: false,
      connected: !!creds.token && !expired && data?.status === "connected",
      token: creds.token ?? null,
      expiresAt,
      status: data?.status ?? "disconnected",
      username: creds.username ?? null,
      loginMode: creds.login_mode ?? null,
    });
    if (creds.token) sessionStorage.setItem("pb_token", creds.token);
  }, []);

  const sendOtp = useCallback(async (username: string) => {
    const { data, error } = await supabase.functions.invoke("policyboss-auth", {
      body: { action: "send_otp", username },
    });
    if (error) throw error;
    await load();
    return data;
  }, [load]);

  const verifyOtp = useCallback(async (otp: string, username?: string) => {
    const { data, error } = await supabase.functions.invoke("policyboss-auth", {
      body: { action: "verify_otp", otp, username },
    });
    if (error) throw error;
    await load();
    return data;
  }, [load]);

  const connect = useCallback(async (username: string, password: string) => {
    const { data, error } = await supabase.functions.invoke("policyboss-auth", {
      body: { action: "login", username, password },
    });
    if (error) throw error;
    await load();
    return data;
  }, [load]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("policyboss-auth", {
      body: { action: "refresh" },
    });
    if (error) throw error;
    await load();
    return data;
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { ...state, sendOtp, verifyOtp, connect, refresh, reload: load };
};
