import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, RoleKey } from "@/contexts/SettingsContext";
import { maskPhone, formatPhone } from "@/lib/utils";

export type MaskingPolicy = {
  masked: boolean;
  revealOnDial: boolean;
  display: (phone?: string | null) => string;
  full: (phone?: string | null) => string;
  copyText: (phone?: string | null) => string;
};

export const useMaskingPolicy = (): MaskingPolicy => {
  const { role } = useAuth();
  const { masking } = useSettings();

  return useMemo(() => {
    const key = (role ?? "telecaller") as RoleKey;
    const policy = masking[key] ?? { masked: true, reveal_on_dial: false };
    return {
      masked: policy.masked,
      revealOnDial: policy.reveal_on_dial,
      display: (p) => policy.masked ? maskPhone(p) : formatPhone(p),
      full: (p) => formatPhone(p),
      copyText: (p) => policy.masked ? maskPhone(p) : (p ?? ""),
    };
  }, [role, masking]);
};
