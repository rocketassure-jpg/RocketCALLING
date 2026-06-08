import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoleKey = "admin" | "manager" | "telecaller" | "agent";

export type MaskingConfig = Record<RoleKey, { masked: boolean; reveal_on_dial: boolean }>;

export type BrandConfig = {
  primary: string;        // "0 85% 50%"
  secondary: string;
  sidebar_bg: string;
  logo_url: string;
  company_name: string;
};

const DEFAULT_MASKING: MaskingConfig = {
  admin:      { masked: false, reveal_on_dial: false },
  manager:    { masked: false, reveal_on_dial: false },
  telecaller: { masked: true,  reveal_on_dial: true  },
  agent:      { masked: true,  reveal_on_dial: false },
};

const DEFAULT_BRAND: BrandConfig = {
  primary: "0 85% 50%",
  secondary: "14 90% 55%",
  sidebar_bg: "0 0% 100%",
  logo_url: "",
  company_name: "Rocket Services",
};

type Ctx = {
  loading: boolean;
  masking: MaskingConfig;
  brand: BrandConfig;
  settingsId: string | null;
  reload: () => Promise<void>;
  saveMasking: (m: MaskingConfig) => Promise<void>;
  saveBrand: (b: BrandConfig) => Promise<void>;
};

const SettingsCtx = createContext<Ctx>({} as Ctx);

const applyBrand = (b: BrandConfig) => {
  const root = document.documentElement;
  if (b.primary) root.style.setProperty("--primary", b.primary);
  if (b.secondary) root.style.setProperty("--accent", b.secondary);
  if (b.sidebar_bg) root.style.setProperty("--sidebar-background", b.sidebar_bg);
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [masking, setMasking] = useState<MaskingConfig>(DEFAULT_MASKING);
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettingsId((data as any).id);
      const m = (data as any).masking_config;
      const b = (data as any).brand_config;
      if (m && typeof m === "object") setMasking({ ...DEFAULT_MASKING, ...m });
      if (b && typeof b === "object") {
        const merged = { ...DEFAULT_BRAND, ...b };
        setBrand(merged);
        applyBrand(merged);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const saveMasking = async (m: MaskingConfig) => {
    if (!settingsId) return;
    await supabase.from("app_settings").update({ masking_config: m as any } as any).eq("id", settingsId);
    setMasking(m);
  };
  const saveBrand = async (b: BrandConfig) => {
    if (!settingsId) return;
    await supabase.from("app_settings").update({ brand_config: b as any } as any).eq("id", settingsId);
    setBrand(b);
    applyBrand(b);
  };

  return (
    <SettingsCtx.Provider value={{ loading, masking, brand, settingsId, reload, saveMasking, saveBrand }}>
      {children}
    </SettingsCtx.Provider>
  );
};

export const useSettings = () => useContext(SettingsCtx);
