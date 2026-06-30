import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IRDAIRates = {
  TP_RATES: Record<string, { max: number; amt: number }[]>;
  ADDONS: { id: string; label: string; rate: number }[];
  NCB_OPTIONS: number[];
};

export const DEFAULT_IRDAI_RATES: IRDAIRates = {
  TP_RATES: {
    PrivateCar: [
      { max: 1000, amt: 2094 },
      { max: 1500, amt: 3416 },
      { max: 99999, amt: 7897 },
    ],
    TwoWheeler: [
      { max: 75, amt: 538 },
      { max: 150, amt: 714 },
      { max: 350, amt: 1366 },
      { max: 99999, amt: 2804 },
    ],
    GCV: [{ max: 99999, amt: 14390 }],
    PCV: [{ max: 99999, amt: 8510 }],
    SchoolBus: [{ max: 99999, amt: 12500 }],
    Tractor: [{ max: 99999, amt: 1075 }],
  },
  ADDONS: [
    { id: "zero_dep", label: "Zero Depreciation", rate: 0.15 },
    { id: "engine", label: "Engine Protect", rate: 0.05 },
    { id: "rti", label: "Return to Invoice", rate: 0.10 },
    { id: "consumables", label: "Consumables", rate: 0.03 },
    { id: "rsa", label: "Roadside Assistance", rate: 0.005 },
  ],
  NCB_OPTIONS: [0, 20, 25, 35, 45, 50],
};

export function useIRDAIRates() {
  const [rates, setRates] = useState<IRDAIRates>(DEFAULT_IRDAI_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("irdai_rates")
          .limit(1)
          .maybeSingle();
        const remote = (data as any)?.irdai_rates;
        if (remote && typeof remote === "object") {
          setRates({
            TP_RATES: remote.TP_RATES ?? DEFAULT_IRDAI_RATES.TP_RATES,
            ADDONS: remote.ADDONS ?? DEFAULT_IRDAI_RATES.ADDONS,
            NCB_OPTIONS: remote.NCB_OPTIONS ?? DEFAULT_IRDAI_RATES.NCB_OPTIONS,
          });
        }
      } catch {
        /* fall back to defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { rates, loading };
}
