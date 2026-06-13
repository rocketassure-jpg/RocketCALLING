import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

type Broker = { id: string; name: string };
type Payout = {
  id: string; broker_id: string; period_label: string;
  period_start: string | null; period_end: string | null;
  expected_amount: number; received_amount: number;
  utr_number: string | null; payout_date: string | null;
  status: string; remarks: string | null;
};

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const empty = { broker_id: "", period_label: "", period_start: "", period_end: "", expected_amount: 0, received_amount: 0, utr_number: "", payout_date: "", status: "pending", remarks: "" };

export const BrokerPayouts = () => {
  const { companyId, user } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [rows, setRows] = useState<Payout[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payout | null>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [b, p] = await Promise.all([
      (supabase as any).from("brokers").select("id,name").order("name"),
      (supabase as any).from("broker_payouts").select("*").order("created_at", { ascending: false }),
    ]);
    setBrokers((b.data ?? []) as Broker[]);
    setRows((p.data ?? []) as Payout[]);
  };
  useEffect(() => { load(); }, []);

  const brokerName = (id: string) => brokers.find((b) => b.id === id)?.name ?? "—";

  const computeStatus = (exp: number, rec: number) => {
    if (!rec) return "pending";
    if (Math.abs(exp - rec) < 0.5) return "received";
    return "discrepancy";
  };

  const save = async () => {
    if (!form.broker_id || !form.period_label) return toast({ title: "Broker & period required", variant: "destructive" });
    const status = computeStatus(Number(form.expected_amount) || 0, Number(form.received_amount) || 0);
    const payload: any = {
      broker_id: form.broker_id, period_label: form.period_label,
      period_start: form.period_start || null, period_end: form.period_end || null,
      expected_amount: Number(form.expected_amount) || 0,
      received_amount: Number(form.received_amount) || 0,
      utr_number: form.utr_number || null, payout_date: form.payout_date || null,
      status, remarks: form.remarks || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from("broker_payouts").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      payload.company_id = companyId; payload.created_by = user?.id ?? null;
      const { error } = await (supabase as any).from("broker_payouts").insert(payload);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => { if (!confirm("Delete?")) return; await (supabase as any).from("broker_payouts").delete().eq("id", id); load(); };

  const startEdit = (p: Payout) => {
    setEditing(p);
    setForm({
      broker_id: p.broker_id, period_label: p.period_label,
      period_start: p.period_start ?? "", period_end: p.period_end ?? "",
      expected_amount: p.expected_amount, received_amount: p.received_amount,
      utr_number: p.utr_number ?? "", payout_date: p.payout_date ?? "",
      status: p.status, remarks: p.remarks ?? "",
    });
    setOpen(true);
  };

  const totalExp = rows.reduce((a, r) => a + Number(r.expected_amount || 0), 0);
  const totalRec = rows.reduce((a, r) => a + Number(r.received_amount || 0), 0);
  const discrepancies = rows.filter((r) => r.status === "discrepancy").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Expected {inr(totalExp)}</Badge>
          <Badge>Received {inr(totalRec)}</Badge>
          {discrepancies > 0 && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> {discrepancies} discrepancies</Badge>}
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add Payout</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Broker</TableHead><TableHead>Period</TableHead>
              <TableHead className="text-right">Expected</TableHead><TableHead className="text-right">Received</TableHead>
              <TableHead>UTR</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{brokerName(p.broker_id)}</TableCell>
                  <TableCell className="text-xs">{p.period_label}</TableCell>
                  <TableCell className="text-right">{inr(p.expected_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">{inr(p.received_amount)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.utr_number ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.payout_date ?? "—"}</TableCell>
                  <TableCell><Badge variant={p.status === "received" ? "default" : p.status === "discrepancy" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No payouts logged.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit payout" : "Add payout"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Broker *</Label>
              <Select value={form.broker_id} onValueChange={(v) => setForm({ ...form, broker_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period Label *</Label><Input placeholder="e.g. Mar 2026" value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} /></div>
            <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
            <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
            <div><Label>Expected (₹)</Label><Input type="number" value={form.expected_amount} onChange={(e) => setForm({ ...form, expected_amount: e.target.value })} /></div>
            <div><Label>Received (₹)</Label><Input type="number" value={form.received_amount} onChange={(e) => setForm({ ...form, received_amount: e.target.value })} /></div>
            <div><Label>UTR Number</Label><Input value={form.utr_number} onChange={(e) => setForm({ ...form, utr_number: e.target.value })} /></div>
            <div><Label>Payout Date</Label><Input type="date" value={form.payout_date} onChange={(e) => setForm({ ...form, payout_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
