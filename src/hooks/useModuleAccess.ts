import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ModuleKey =
  | "telecaller_crm"
  | "accounts"
  | "motor_insurance"
  | "health_insurance"
  | "life_insurance"
  | "rto_services";

export const useModuleAccess = () => {
  const { companyId } = useAuth();
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!companyId) { setModules([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("company_subscriptions")
      .select("module_key, end_date, status")
      .eq("company_id", companyId)
      .eq("status", "active");
    const today = new Date().toISOString().slice(0, 10);
    const active = (data ?? [])
      .filter((r: any) => !r.end_date || r.end_date >= today)
      .map((r: any) => r.module_key as string);
    setModules(active);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { reload(); }, [reload]);

  return {
    loading,
    modules,
    has: (key: ModuleKey) => modules.includes(key),
    reload,
  };
};
