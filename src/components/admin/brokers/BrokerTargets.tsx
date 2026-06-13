import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Layers } from "lucide-react";

type Broker = { id: string; name: string };
type Target = { id: string; broker_id: string; product_category: string; period_type: string; period_start: string; period_end: string; target_amount: number };
type Slab = { id: string; target_id: string | null; broker_id: string; slab_min: number; slab_max: number | null; commission_rate: number; effective_from: string; effective_to: string | null };
type Achievement = { target_id: string; achieved_amount: number };

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const CATS = ["Life", "Health", "Motor", "General"];

const tForm = { broker_id: "", product_category: "Motor", period_type: "monthly", period_start: "", period_end: "", target_amount: 0 };
const sForm = { broker_id: "", target_id: "", slab_min: 0, slab_max: "" as any, commission_rate: 0, effective_from: "", effective_to: "" };

export const BrokerTargets = () => {
  const { companyId } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [openT, setOpenT] = useState(false);
  const [openS, setOpenS] = useState(false);
  const [tf, setTf] = useState<any>(tForm);
  const [sf, setSf] = useState<any>(sForm);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  const load = async () => {
    const [b, t, s, a] = await Promise.all([
      (supabase as any).from("brokers").select("id,name").order("name"),
      (supabase as any).from("broker_targets").select("*").order("period_start", { ascending: false }),
      (supabase as any).from("broker_slabs").select("*").order("slab_min"),
      (supabase as any).from("broker_achievements").select("target_id,achieved_amount"),
    ]);
    setBrokers((b.data ?? []) as Broker[]);
    setTargets((t.data ?? []) as Target[]);
    setSlabs((s.data ?? []) as Slab[]);
    setAchievements((a.data ?? []) as Achievement[]);
  };
  useEffect(() => { load(); }, []);

  const achMap = useMemo(() => Object.fromEntries(achievements.map((a) => [a.target_id, Number(a.achieved_amount)])), [achievements]);
  const brokerName = (id: string) => brokers.find((b) => b.id === id)?.name ?? "—";

  const saveTarget = async () => {
    if (!tf.broker_id || !tf.period_start || !tf.period_end) return toast({ title: "Fill all fields", variant: "destructive" });
    const { error } = await (supabase as any).from("broker_targets").insert({ ...tf, target_amount: Number(tf.target_amount) || 0, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setOpenT(false); setTf(tForm); load();
  };
  const delTarget = async (id: string) => {
    if (!confirm("Delete target and its slabs?")) return;
    await (supabase as any).from("broker_targets").delete().eq("id", id); load();
  };

  const saveSlab = async () => {
    if (!sf.broker_id || !sf.effective_from || !sf.commission_rate) return toast({ title: "Fill required fields", variant: "destructive" });
    const payload: any = {
      company_id: companyId, broker_id: sf.broker_id,
      target_id: sf.target_id || selectedTarget?.id || null,
      slab_min: Number(sf.slab_min) || 0,
      slab_max: sf.slab_max === "" ? null : Number(sf.slab_max),
      commission_rate: Number(sf.commission_rate),
      effective_from: sf.effective_from,
      effective_to: sf.effective_to || null,
    };
    const { error } = await (supabase as any).from("broker_slabs").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setOpenS(false); setSf(sForm); load();
  };
  const delSlab = async (id: string) => { await (supabase as any).from("broker_slabs").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Set targets per broker per period. Add slabs (min/max + rate) with effective dates.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSf({ ...sForm, target_id: "" }); setSelectedTarget(null); setOpenS(true); }}><Layers className="mr-1 h-4 w-4" /> Add Slab</Button>
          <Button onClick={() => { setTf(tForm); setOpenT(true); }}><Plus className="mr-1 h-4 w-4" /> Add Target</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {targets.map((t) => {
          const ach = achMap[t.id] || 0;
          const pct = t.target_amount ? Math.min(100, (ach / Number(t.target_amount)) * 100) : 0;
          const tSlabs = slabs.filter((s) => s.target_id === t.id);
          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {brokerName(t.broker_id)} · <Badge variant="outline">{t.product_category}</Badge> · <span className="text-xs font-normal text-muted-foreground">{t.period_type} · {t.period_start} → {t.period_end}</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSf({ ...sForm, broker_id: t.broker_id, target_id: t.id }); setSelectedTarget(t); setOpenS(true); }}>+ Slab</Button>
                    <Button size="sm" variant="ghost" onClick={() => delTarget(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Achieved {inr(ach)} of {inr(t.target_amount)}</span>
                    <span className="font-semibold">{pct.toFixed(1)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
                {tSlabs.length > 0 && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Rate %</TableHead>
                      <TableHead>Effective</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {tSlabs.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{inr(s.slab_min)}</TableCell>
                          <TableCell>{s.slab_max ? inr(s.slab_max) : "∞"}</TableCell>
                          <TableCell className="font-semibold text-primary">{s.commission_rate}%</TableCell>
                          <TableCell className="text-xs">{s.effective_from} → {s.effective_to ?? "open"}</TableCell>
                          <TableCell><Button size="sm" variant="ghost" onClick={() => delSlab(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!targets.length && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No targets yet.</CardContent></Card>}
      </div>

      {/* Add Target */}
      <Dialog open={openT} onOpenChange={setOpenT}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add target</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Broker</Label>
              <Select value={tf.broker_id} onValueChange={(v) => setTf({ ...tf, broker_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={tf.product_category} onValueChange={(v) => setTf({ ...tf, product_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period</Label>
              <Select value={tf.period_type} onValueChange={(v) => setTf({ ...tf, period_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start</Label><Input type="date" value={tf.period_start} onChange={(e) => setTf({ ...tf, period_start: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" value={tf.period_end} onChange={(e) => setTf({ ...tf, period_end: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Target Amount (₹)</Label><Input type="number" value={tf.target_amount} onChange={(e) => setTf({ ...tf, target_amount: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenT(false)}>Cancel</Button><Button onClick={saveTarget}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Slab */}
      <Dialog open={openS} onOpenChange={setOpenS}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add slab</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Broker</Label>
              <Select value={sf.broker_id} onValueChange={(v) => setSf({ ...sf, broker_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Target (optional — leave empty for broker-wide)</Label>
              <Select value={sf.target_id || "none"} onValueChange={(v) => setSf({ ...sf, target_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None (broker-wide) —</SelectItem>
                  {targets.filter((t) => !sf.broker_id || t.broker_id === sf.broker_id).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.product_category} · {t.period_start} → {t.period_end}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Slab Min (₹)</Label><Input type="number" value={sf.slab_min} onChange={(e) => setSf({ ...sf, slab_min: e.target.value })} /></div>
            <div><Label>Slab Max (₹, blank=∞)</Label><Input type="number" value={sf.slab_max} onChange={(e) => setSf({ ...sf, slab_max: e.target.value })} /></div>
            <div><Label>Commission Rate %</Label><Input type="number" step="0.01" value={sf.commission_rate} onChange={(e) => setSf({ ...sf, commission_rate: e.target.value })} /></div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div><Label>Effective From</Label><Input type="date" value={sf.effective_from} onChange={(e) => setSf({ ...sf, effective_from: e.target.value })} /></div>
              <div><Label>Effective To</Label><Input type="date" value={sf.effective_to} onChange={(e) => setSf({ ...sf, effective_to: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenS(false)}>Cancel</Button><Button onClick={saveSlab}>Add Slab</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
