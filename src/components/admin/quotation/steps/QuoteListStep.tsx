import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { QuoteDraft } from "../MotorQuoteWizard";

type Insurer = {
  code: string; name: string; planType: string;
  baseOdRate: number; // % of IDV
  tpFixed: number;
};

// Stub insurer panel; replace with PolicyBoss quotes API response.
const INSURERS: Insurer[] = [
  { code: "DIGIT", name: "Digit Insurance",   planType: "Comprehensive", baseOdRate: 2.2, tpFixed: 2094 },
  { code: "ICICI", name: "ICICI Lombard",     planType: "Comprehensive", baseOdRate: 2.5, tpFixed: 2094 },
  { code: "HDFC",  name: "HDFC Ergo",         planType: "Comprehensive", baseOdRate: 2.4, tpFixed: 2094 },
  { code: "BAJAJ", name: "Bajaj Allianz",     planType: "Comprehensive", baseOdRate: 2.3, tpFixed: 2094 },
  { code: "TATA",  name: "Tata AIG",          planType: "Comprehensive", baseOdRate: 2.6, tpFixed: 2094 },
  { code: "RELI",  name: "Reliance General",  planType: "Comprehensive", baseOdRate: 2.7, tpFixed: 2094 },
];

const ADDONS = [
  { key: "zero_dep",      label: "Zero Depreciation",  odPct: 15, flat: 0 },
  { key: "engine",        label: "Engine Protection",  odPct: 5,  flat: 0 },
  { key: "rti",           label: "Return to Invoice",  odPct: 10, flat: 0 },
  { key: "consumables",   label: "Consumables Cover",  odPct: 3,  flat: 0 },
  { key: "rsa",           label: "Roadside Assistance", odPct: 0, flat: 399 },
  { key: "ncb",           label: "NCB Protection",      odPct: 3, flat: 0 },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const QuoteListStep = ({
  draft, setDraft, onNext, onBack,
}: {
  draft: QuoteDraft;
  setDraft: (d: Partial<QuoteDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const baseIdv = draft.idv ?? 450000;
  const [idv, setIdv] = useState<number>(baseIdv);
  const [addons, setAddons] = useState<string[]>(draft.selected_addons ?? []);

  useEffect(() => { setDraft({ idv, selected_addons: addons }); /* eslint-disable-next-line */ }, [idv, addons]);

  const quotes = useMemo(() => {
    return INSURERS.map((ins) => {
      const od = (idv * ins.baseOdRate) / 100;
      const tp = ins.tpFixed;
      const addonTotal = ADDONS
        .filter((a) => addons.includes(a.key))
        .reduce((sum, a) => sum + ((od * a.odPct) / 100) + a.flat, 0);
      const net = od + tp + addonTotal;
      return { ins, od, tp, addonTotal, net };
    });
  }, [idv, addons]);

  const selected = quotes.find((q) => q.ins.code === draft.insurer_code) ?? null;

  const select = (q: typeof quotes[number]) => {
    setDraft({
      insurer_code: q.ins.code,
      insurer_name: q.ins.name,
      plan_type: q.ins.planType.toLowerCase(),
      idv,
      od_premium: q.od,
      tp_premium: q.tp,
      addon_premium: q.addonTotal,
      net_premium: q.net,
      gst_amount: Math.round(q.net * 0.18),
      gross_premium: Math.round(q.net * 1.18),
      selected_addons: addons,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">IDV (Insured Declared Value)</div>
            <div className="font-mono text-lg font-bold">{inr(idv)}</div>
          </div>
          <Slider
            min={Math.round(baseIdv * 0.8)}
            max={Math.round(baseIdv * 1.2)}
            step={1000}
            value={[idv]}
            onValueChange={(v) => setIdv(v[0])}
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {ADDONS.map((a) => (
              <label key={a.key} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                <Checkbox
                  checked={addons.includes(a.key)}
                  onCheckedChange={(v) => setAddons((s) => v ? [...s, a.key] : s.filter((x) => x !== a.key))}
                />
                {a.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {quotes.map((q) => {
          const active = draft.insurer_code === q.ins.code;
          return (
            <Card key={q.ins.code} className={active ? "border-primary ring-2 ring-primary" : ""}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{q.ins.name}</div>
                  <Badge variant="outline">{q.ins.planType}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">IDV {inr(idv)}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">OD</div><div className="font-mono">{inr(q.od)}</div></div>
                  <div><div className="text-muted-foreground">TP</div><div className="font-mono">{inr(q.tp)}</div></div>
                  <div><div className="text-muted-foreground">Add-ons</div><div className="font-mono">{inr(q.addonTotal)}</div></div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Net Premium</div>
                    <div className="text-lg font-bold text-primary">{inr(q.net)}</div>
                  </div>
                  <Button size="sm" variant={active ? "default" : "outline"} onClick={() => select(q)}>
                    {active ? "Selected" : "Select"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!selected}>Send Quote →</Button>
      </div>
    </div>
  );
};
