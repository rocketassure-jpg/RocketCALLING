import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";

type Broker = { id: string; name: string };
type Target = { id: string; broker_id: string; product_category: string; period_start: string; period_end: string; target_amount: number };
type Slab = { id: string; target_id: string | null; broker_id: string; slab_min: number; slab_max: number | null; commission_rate: number; effective_from: string; effective_to: string | null };
type Ach = { target_id: string; achieved_amount: number };

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const CATS = ["Life", "Health", "Motor", "General"];

export const SlabSimulator = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [ach, setAch] = useState<Ach[]>([]);
  const [brokerId, setBrokerId] = useState("");
  const [category, setCategory] = useState("Motor");
  const [extra, setExtra] = useState(100000);
  const onDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      const [b, t, s, a] = await Promise.all([
        (supabase as any).from("brokers").select("id,name").order("name"),
        (supabase as any).from("broker_targets").select("*"),
        (supabase as any).from("broker_slabs").select("*"),
        (supabase as any).from("broker_achievements").select("target_id,achieved_amount"),
      ]);
      setBrokers((b.data ?? []) as Broker[]);
      setTargets((t.data ?? []) as Target[]);
      setSlabs((s.data ?? []) as Slab[]);
      setAch((a.data ?? []) as Ach[]);
    })();
  }, []);

  const result = useMemo(() => {
    if (!brokerId) return null;
    const today = onDate;
    const target = targets.find((t) =>
      t.broker_id === brokerId && t.product_category === category &&
      t.period_start <= today && t.period_end >= today
    );
    const currentAch = target ? Number(ach.find((a) => a.target_id === target.id)?.achieved_amount ?? 0) : 0;
    const projected = currentAch + Number(extra || 0);
    const candidates = slabs.filter((s) =>
      s.broker_id === brokerId &&
      (s.target_id === null || (target && s.target_id === target.id)) &&
      s.effective_from <= today && (s.effective_to === null || s.effective_to >= today) &&
      projected >= Number(s.slab_min) && (s.slab_max === null || projected <= Number(s.slab_max))
    );
    const applicable = candidates.sort((a, b) => Number(b.commission_rate) - Number(a.commission_rate))[0];
    const payout = applicable ? (Number(extra) * Number(applicable.commission_rate)) / 100 : 0;
    const totalPayoutAtProjected = applicable ? (projected * Number(applicable.commission_rate)) / 100 : 0;
    return { target, currentAch, projected, applicable, payout, totalPayoutAtProjected };
  }, [brokerId, category, extra, targets, slabs, ach, onDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Slab Simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Broker</Label>
            <Select value={brokerId} onValueChange={setBrokerId}>
              <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
              <SelectContent>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Hypothetical Extra Business (₹)</Label><Input type="number" value={extra} onChange={(e) => setExtra(Number(e.target.value))} /></div>
        </div>

        {result && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {!result.target && <p className="text-sm text-muted-foreground">No active target for this broker + category for today's date.</p>}
            {result.target && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">Current achieved</div><div className="font-semibold">{inr(result.currentAch)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Projected total</div><div className="font-semibold">{inr(result.projected)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Applicable rate</div><div className="font-semibold text-primary">{result.applicable ? `${result.applicable.commission_rate}%` : "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Payout on extra</div><div className="font-semibold text-success">{inr(result.payout)}</div></div>
                </div>
                {result.applicable && (
                  <div className="text-xs text-muted-foreground">
                    Slab: {inr(result.applicable.slab_min)} → {result.applicable.slab_max ? inr(result.applicable.slab_max) : "∞"} · effective {result.applicable.effective_from}
                  </div>
                )}
                {!result.applicable && <Badge variant="destructive">No matching slab at projected amount</Badge>}
                {result.applicable && (
                  <div className="mt-2 rounded border bg-background p-2 text-xs">
                    Projected total payout at this slab rate: <span className="font-semibold">{inr(result.totalPayoutAtProjected)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
