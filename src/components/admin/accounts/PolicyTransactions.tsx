import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export const PolicyTransactions = () => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const empty: any = { txn_date: today(), policy_no: "", insurer_id: "", agent_id: "", client_name: "", client_phone: "", policy_type: "motor", product_subtype: "", od_premium: 0, tp_premium: 0, net_premium: 0, gst_amount: 0, gross_premium: 0, commission_rate: 0, commission_amount: 0, reward_amount: 0, tds_amount: 0, agent_payout: 0, company_share: 0, expected_payout_date: "", status: "expected", notes: "" };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [t, i, a] = await Promise.all([
      supabase.from("policy_transactions").select("*, insurers(name), agents_profile(full_name)").order("txn_date", { ascending: false }).limit(500),
      supabase.from("insurers").select("id,name").order("name"),
      supabase.from("agents_profile").select("id,full_name,split_percent").order("full_name"),
    ]);
    setRows(t.data ?? []); setInsurers(i.data ?? []); setAgents(a.data ?? []);
  };
  useEffect(() => { load(); }, []);

  // Auto-calc commission / payout when premium / rate / agent changes
  const recalc = (next: any) => {
    const net = Number(next.net_premium) || (Number(next.od_premium) + Number(next.tp_premium));
    const gross = net + (Number(next.gst_amount) || 0);
    const commission = +(net * (Number(next.commission_rate) || 0) / 100).toFixed(2);
    const agent = agents.find((x) => x.id === next.agent_id);
    const split = agent ? Number(agent.split_percent) || 0 : 0;
    const payout = +(commission * split / 100).toFixed(2);
    const tds = +(payout * 0.05).toFixed(2);
    return { ...next, net_premium: net, gross_premium: gross, commission_amount: commission, agent_payout: payout, tds_amount: tds, company_share: +(commission - payout).toFixed(2) };
  };

  const setField = (k: string, v: any) => setForm((f: any) => recalc({ ...f, [k]: v }));

  const save = async () => {
    if (!companyId) return;
    const payload = { ...form, company_id: companyId, created_by: user?.id, expected_payout_date: form.expected_payout_date || null, insurer_id: form.insurer_id || null, agent_id: form.agent_id || null };
    const { error } = await supabase.from("policy_transactions").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Transaction recorded" });
    setOpen(false); setForm(empty); load();
  };

  const markReceived = async (r: any) => {
    const { error } = await supabase.from("policy_transactions").update({ status: "received", received_date: today(), received_amount: r.commission_amount }).eq("id", r.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Marked received" }); load();
  };
  const del = async (id: string) => { if (!confirm("Delete this transaction?")) return; await supabase.from("policy_transactions").delete().eq("id", id); load(); };

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.policy_no || "").toLowerCase().includes(s) || (r.client_name || "").toLowerCase().includes(s) || (r.client_phone || "").includes(search);
  }), [rows, search, statusFilter]);

  const statusColor = (s: string) => s === "received" ? "default" : s === "overdue" ? "destructive" : s === "cancelled" ? "outline" : "secondary";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Transactions ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input className="w-48" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="expected">Expected</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader><DialogTitle>New Policy Transaction</DialogTitle></DialogHeader>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.txn_date} onChange={(e) => setField("txn_date", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Policy No.</Label><Input value={form.policy_no} onChange={(e) => setField("policy_no", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Type</Label>
                    <Select value={form.policy_type} onValueChange={(v) => setField("policy_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motor">Motor</SelectItem><SelectItem value="health">Health</SelectItem>
                        <SelectItem value="life">Life</SelectItem><SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Insurer</Label>
                    <Select value={form.insurer_id} onValueChange={(v) => setField("insurer_id", v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Agent</Label>
                    <Select value={form.agent_id} onValueChange={(v) => setField("agent_id", v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name} ({a.split_percent}%)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Subtype</Label><Input value={form.product_subtype} onChange={(e) => setField("product_subtype", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Client Name</Label><Input value={form.client_name} onChange={(e) => setField("client_name", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Client Phone</Label><Input value={form.client_phone} onChange={(e) => setField("client_phone", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Expected Payout Date</Label><Input type="date" value={form.expected_payout_date} onChange={(e) => setField("expected_payout_date", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>OD Premium</Label><Input type="number" value={form.od_premium} onChange={(e) => setField("od_premium", Number(e.target.value))} /></div>
                  <div className="space-y-1.5"><Label>TP Premium</Label><Input type="number" value={form.tp_premium} onChange={(e) => setField("tp_premium", Number(e.target.value))} /></div>
                  <div className="space-y-1.5"><Label>Net Premium</Label><Input type="number" value={form.net_premium} onChange={(e) => setField("net_premium", Number(e.target.value))} /></div>
                  <div className="space-y-1.5"><Label>GST</Label><Input type="number" value={form.gst_amount} onChange={(e) => setField("gst_amount", Number(e.target.value))} /></div>
                  <div className="space-y-1.5"><Label>Commission %</Label><Input type="number" step="0.01" value={form.commission_rate} onChange={(e) => setField("commission_rate", Number(e.target.value))} /></div>
                  <div className="space-y-1.5"><Label>Reward ₹</Label><Input type="number" value={form.reward_amount} onChange={(e) => setField("reward_amount", Number(e.target.value))} /></div>
                </div>
                <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm md:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">Gross Premium</div><div className="font-semibold">{inr(form.gross_premium)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Commission</div><div className="font-semibold text-primary">{inr(form.commission_amount)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Agent Payout</div><div className="font-semibold">{inr(form.agent_payout)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Company Share</div><div className="font-semibold text-success">{inr(form.company_share)}</div></div>
                </div>
                <Button variant="hero" onClick={save}>Save Transaction</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Policy #</TableHead><TableHead>Client</TableHead>
            <TableHead>Insurer</TableHead><TableHead>Agent</TableHead><TableHead>Type</TableHead>
            <TableHead className="text-right">Net Prem</TableHead><TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-right">Payout</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.txn_date}</TableCell>
                <TableCell className="font-mono text-xs">{r.policy_no || "—"}</TableCell>
                <TableCell>{r.client_name}<div className="font-mono text-[10px] text-muted-foreground">{r.client_phone}</div></TableCell>
                <TableCell className="text-xs">{r.insurers?.name || "—"}</TableCell>
                <TableCell className="text-xs">{r.agents_profile?.full_name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.policy_type}</Badge></TableCell>
                <TableCell className="text-right">{inr(r.net_premium)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{inr(r.commission_amount)}</TableCell>
                <TableCell className="text-right">{inr(r.agent_payout)}</TableCell>
                <TableCell><Badge variant={statusColor(r.status) as any} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {r.status !== "received" && <Button size="icon" variant="ghost" title="Mark received" onClick={() => markReceived(r)}><CheckCircle2 className="h-4 w-4 text-success" /></Button>}
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">No transactions match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
