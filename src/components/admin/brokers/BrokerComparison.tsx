import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GitCompare } from "lucide-react";

type Broker = { id: string; name: string };
type Slab = { broker_id: string; target_id: string | null; slab_min: number; slab_max: number | null; commission_rate: number; effective_from: string; effective_to: string | null };
type Target = { id: string; broker_id: string; product_category: string; period_start: string; period_end: string };

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const CATS = ["Life", "Health", "Motor", "General"];

export const BrokerComparison = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [category, setCategory] = useState("Motor");
  const [amount, setAmount] = useState(500000);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      const [b, s, t] = await Promise.all([
        (supabase as any).from("brokers").select("id,name").eq("status", "active").order("name"),
        (supabase as any).from("broker_slabs").select("broker_id,target_id,slab_min,slab_max,commission_rate,effective_from,effective_to"),
        (supabase as any).from("broker_targets").select("id,broker_id,product_category,period_start,period_end"),
      ]);
      setBrokers((b.data ?? []) as Broker[]);
      setSlabs((s.data ?? []) as Slab[]);
      setTargets((t.data ?? []) as Target[]);
    })();
  }, []);

  const rows = useMemo(() => {
    return brokers.map((b) => {
      const validTargets = targets.filter((t) => t.broker_id === b.id && t.product_category === category && t.period_start <= today && t.period_end >= today);
      const targetIds = new Set(validTargets.map((t) => t.id));
      const candidates = slabs.filter((s) =>
        s.broker_id === b.id &&
        (s.target_id === null || targetIds.has(s.target_id)) &&
        s.effective_from <= today && (s.effective_to === null || s.effective_to >= today) &&
        Number(amount) >= Number(s.slab_min) && (s.slab_max === null || Number(amount) <= Number(s.slab_max))
      );
      const best = candidates.sort((a, b) => Number(b.commission_rate) - Number(a.commission_rate))[0];
      return { broker: b, rate: best ? Number(best.commission_rate) : null, payout: best ? (Number(amount) * Number(best.commission_rate)) / 100 : 0 };
    }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [brokers, slabs, targets, category, amount, today]);

  const topRate = rows[0]?.rate ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GitCompare className="h-4 w-4" /> Multi-Broker Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Product Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Business Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Broker</TableHead><TableHead>Applicable Rate</TableHead>
            <TableHead className="text-right">Payout @ {inr(amount)}</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.broker.id}>
                <TableCell className="font-medium">{r.broker.name}</TableCell>
                <TableCell>{r.rate !== null ? <span className="font-semibold text-primary">{r.rate}%</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right font-semibold">{inr(r.payout)}</TableCell>
                <TableCell>{r.rate !== null && r.rate === topRate ? <Badge>Best</Badge> : null}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No active brokers.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
