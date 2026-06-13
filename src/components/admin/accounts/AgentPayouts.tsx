import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Wallet, CheckCircle2 } from "lucide-react";

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const AgentPayouts = () => {
  const { companyId } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [agents, setAgents] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<any>({ id: null, agent_id: "", paid_amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_mode: "bank", utr_ref: "" });

  const load = async () => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const [a, t, p] = await Promise.all([
      supabase.from("agents_profile").select("id,full_name,split_percent"),
      supabase.from("policy_transactions").select("agent_id, commission_amount, agent_payout, tds_amount, reward_amount, status").gte("txn_date", start).lte("txn_date", endDate),
      supabase.from("agent_payouts").select("*").eq("period_year", year).eq("period_month", month),
    ]);
    setAgents(a.data ?? []); setTxns(t.data ?? []); setPayouts(p.data ?? []);
  };
  useEffect(() => { load(); }, [year, month]);

  const summary = useMemo(() => agents.map((ag) => {
    const mine = txns.filter((t) => t.agent_id === ag.id);
    const commission = mine.reduce((a, r) => a + Number(r.commission_amount || 0), 0);
    const payout = mine.reduce((a, r) => a + Number(r.agent_payout || 0), 0);
    const tds = mine.reduce((a, r) => a + Number(r.tds_amount || 0), 0);
    const reward = mine.reduce((a, r) => a + Number(r.reward_amount || 0), 0);
    const existing = payouts.find((p) => p.agent_id === ag.id);
    return { agent: ag, commission, payout, tds, reward, net: payout + reward - tds, txnCount: mine.length, existing };
  }).filter((x) => x.txnCount > 0), [agents, txns, payouts]);

  const openPay = (row: any) => {
    setPayForm({ id: row.existing?.id || null, agent_id: row.agent.id, paid_amount: row.existing?.paid_amount || row.net, payment_date: row.existing?.payment_date || new Date().toISOString().slice(0, 10), payment_mode: row.existing?.payment_mode || "bank", utr_ref: row.existing?.utr_ref || "", total_business: row.commission, total_commission: row.commission, total_reward: row.reward, tds_deducted: row.tds, net_payable: row.net });
    setPayOpen(true);
  };

  const savePay = async () => {
    if (!companyId) return;
    const payload: any = {
      company_id: companyId, agent_id: payForm.agent_id, period_year: year, period_month: month,
      total_business: payForm.total_business, total_commission: payForm.total_commission, total_reward: payForm.total_reward,
      tds_deducted: payForm.tds_deducted, net_payable: payForm.net_payable, paid_amount: Number(payForm.paid_amount),
      payment_date: payForm.payment_date, payment_mode: payForm.payment_mode, utr_ref: payForm.utr_ref,
      status: Number(payForm.paid_amount) >= Number(payForm.net_payable) ? "paid" : Number(payForm.paid_amount) > 0 ? "partial" : "pending",
    };
    const op = payForm.id
      ? supabase.from("agent_payouts").update(payload).eq("id", payForm.id)
      : supabase.from("agent_payouts").insert(payload);
    const { error } = await op;
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Payout saved" }); setPayOpen(false); load();
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Agent Payouts</CardTitle>
            <div className="flex gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Agent</TableHead><TableHead>Txns</TableHead>
              <TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Reward</TableHead>
              <TableHead className="text-right">TDS</TableHead><TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {summary.map((r) => (
                <TableRow key={r.agent.id}>
                  <TableCell className="font-medium">{r.agent.full_name}</TableCell>
                  <TableCell>{r.txnCount}</TableCell>
                  <TableCell className="text-right">{inr(r.commission)}</TableCell>
                  <TableCell className="text-right">{inr(r.reward)}</TableCell>
                  <TableCell className="text-right text-destructive">−{inr(r.tds)}</TableCell>
                  <TableCell className="text-right font-bold text-success">{inr(r.net)}</TableCell>
                  <TableCell>{r.existing ? <Badge variant={r.existing.status === "paid" ? "default" : "secondary"} className="capitalize">{r.existing.status}</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openPay(r)}><CheckCircle2 className="h-4 w-4" /> {r.existing ? "Update" : "Pay"}</Button></TableCell>
                </TableRow>
              ))}
              {!summary.length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No agent activity for {MONTHS[month - 1]} {year}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payout</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div>Net Payable: <span className="font-bold">{inr(payForm.net_payable)}</span></div>
            </div>
            <div className="space-y-1.5"><Label>Paid Amount</Label><Input type="number" value={payForm.paid_amount} onChange={(e) => setPayForm({ ...payForm, paid_amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Mode</Label>
              <Select value={payForm.payment_mode} onValueChange={(v) => setPayForm({ ...payForm, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem><SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>UTR / Ref</Label><Input value={payForm.utr_ref} onChange={(e) => setPayForm({ ...payForm, utr_ref: e.target.value })} /></div>
          </div>
          <Button variant="hero" onClick={savePay}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
