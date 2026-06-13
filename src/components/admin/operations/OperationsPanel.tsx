import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Wallet, Receipt, MessageSquareWarning, Wrench, FileCheck2, ClipboardList, Calendar as CalendarIcon } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const db = supabase as any;

export const OperationsPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="expenses"><Receipt className="mr-1 h-4 w-4" />Expenses & P&L</TabsTrigger>
            <TabsTrigger value="remittance"><Wallet className="mr-1 h-4 w-4" />Premium Remittance</TabsTrigger>
            <TabsTrigger value="complaints"><MessageSquareWarning className="mr-1 h-4 w-4" />Complaints</TabsTrigger>
            <TabsTrigger value="service"><Wrench className="mr-1 h-4 w-4" />Service Requests</TabsTrigger>
            <TabsTrigger value="compliance"><FileCheck2 className="mr-1 h-4 w-4" />Compliance</TabsTrigger>
            <TabsTrigger value="tasks"><ClipboardList className="mr-1 h-4 w-4" />Tasks</TabsTrigger>
            <TabsTrigger value="audit"><CalendarIcon className="mr-1 h-4 w-4" />Audit Log</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="pt-4"><ExpensesTab /></TabsContent>
          <TabsContent value="remittance" className="pt-4"><RemittanceTab /></TabsContent>
          <TabsContent value="complaints" className="pt-4"><ComplaintsTab /></TabsContent>
          <TabsContent value="service" className="pt-4"><ServiceTab /></TabsContent>
          <TabsContent value="compliance" className="pt-4"><ComplianceTab /></TabsContent>
          <TabsContent value="tasks" className="pt-4"><TasksTab /></TabsContent>
          <TabsContent value="audit" className="pt-4"><AuditTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/* ---------------- Expenses + P&L ---------------- */
const ExpensesTab = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ category: "", amount: 0, expense_date: today(), paid_to: "", payment_mode: "cash", notes: "" });
  const [pnl, setPnl] = useState<{ commissions: number; expenses: number }>({ commissions: 0, expenses: 0 });

  const load = async () => {
    const { data } = await db.from("expenses").select("*").order("expense_date", { ascending: false });
    setRows(data ?? []);
    const monthStart = new Date(); monthStart.setDate(1);
    const ms = monthStart.toISOString().slice(0, 10);
    const [{ data: payouts }, { data: exps }] = await Promise.all([
      db.from("agent_payouts").select("amount,paid_on").gte("paid_on", ms),
      db.from("expenses").select("amount,expense_date").gte("expense_date", ms),
    ]);
    setPnl({
      commissions: (payouts ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      expenses: (exps ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
    });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.category || !form.amount) return toast({ title: "Category & amount required", variant: "destructive" });
    const { error } = await db.from("expenses").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Expense added" }); setOpen(false); load();
  };
  const remove = async (id: string) => { await db.from("expenses").delete().eq("id", id); load(); };

  const net = pnl.commissions - pnl.expenses;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Commissions (MTD)</div><div className="text-2xl font-bold text-success">₹{pnl.commissions.toLocaleString("en-IN")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expenses (MTD)</div><div className="text-2xl font-bold text-destructive">₹{pnl.expenses.toLocaleString("en-IN")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net P&L</div><div className={`text-2xl font-bold ${net >= 0 ? "text-success" : "text-destructive"}`}>₹{net.toLocaleString("en-IN")}</div></CardContent></Card>
      </div>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Category *</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Rent / Salary / Travel" /></div>
              <div className="space-y-1.5"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Paid To</Label><Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Payment Mode</Label><Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Paid To</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.expense_date}</TableCell>
            <TableCell>{r.category}</TableCell>
            <TableCell>{r.paid_to || "—"}</TableCell>
            <TableCell><Badge variant="outline">{r.payment_mode || "—"}</Badge></TableCell>
            <TableCell className="text-right font-mono">₹{Number(r.amount).toLocaleString("en-IN")}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}{rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No expenses yet</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
  );
};

/* ---------------- Premium Remittance ---------------- */
const RemittanceTab = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ policy_number: "", customer_name: "", policy_type: "motor", expected_amount: 0, remitted_amount: 0, broker_id: "", remittance_date: today(), utr_no: "", status: "pending" });

  const load = async () => {
    const [{ data }, { data: b }] = await Promise.all([
      db.from("premium_remittance").select("*, brokers(name)").order("remittance_date", { ascending: false }),
      db.from("brokers").select("id,name"),
    ]);
    setRows(data ?? []); setBrokers(b ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form, company_id: companyId, broker_id: form.broker_id || null };
    const { error } = await db.from("premium_remittance").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Remittance logged" }); setOpen(false); load();
  };
  const remove = async (id: string) => { await db.from("premium_remittance").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add Remittance</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Premium Remittance</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Policy #</Label><Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Type</Label><Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="motor">Motor</SelectItem><SelectItem value="health">Health</SelectItem><SelectItem value="life">Life</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Broker</Label><Select value={form.broker_id || "none"} onValueChange={(v) => setForm({ ...form, broker_id: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Expected ₹</Label><Input type="number" value={form.expected_amount} onChange={(e) => setForm({ ...form, expected_amount: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Remitted ₹</Label><Input type="number" value={form.remitted_amount} onChange={(e) => setForm({ ...form, remitted_amount: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.remittance_date} onChange={(e) => setForm({ ...form, remittance_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>UTR</Label><Input value={form.utr_no} onChange={(e) => setForm({ ...form, utr_no: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Policy</TableHead><TableHead>Customer</TableHead><TableHead>Broker</TableHead><TableHead className="text-right">Expected</TableHead><TableHead className="text-right">Remitted</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id} className={r.discrepancy ? "bg-destructive/5" : undefined}>
            <TableCell>{r.remittance_date || "—"}</TableCell>
            <TableCell className="font-mono text-xs">{r.policy_number}</TableCell>
            <TableCell>{r.customer_name}</TableCell>
            <TableCell>{r.brokers?.name || "—"}</TableCell>
            <TableCell className="text-right font-mono">₹{Number(r.expected_amount).toLocaleString("en-IN")}</TableCell>
            <TableCell className="text-right font-mono">₹{Number(r.remitted_amount).toLocaleString("en-IN")}</TableCell>
            <TableCell><Badge variant={r.status === "completed" ? "default" : r.discrepancy ? "destructive" : "secondary"}>{r.status}{r.discrepancy ? " · Δ" : ""}</Badge></TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}{rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No remittances yet</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
  );
};

/* ---------------- Complaints ---------------- */
const ComplaintsTab = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ subject: "", description: "", severity: "medium", status: "open" });

  const load = async () => { const { data } = await db.from("complaints").select("*").order("opened_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.subject) return toast({ title: "Subject required", variant: "destructive" });
    const { error } = await db.from("complaints").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Complaint logged" }); setOpen(false); load();
  };
  const setStatus = async (id: string, status: string) => {
    const patch: any = { status }; if (status === "resolved") patch.resolved_at = new Date().toISOString();
    await db.from("complaints").update(patch).eq("id", id); load();
  };
  const remove = async (id: string) => { await db.from("complaints").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> New Complaint</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Complaint</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5"><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Severity</Label><Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Opened</TableHead><TableHead>Subject</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{new Date(r.opened_at).toLocaleDateString()}</TableCell>
            <TableCell>{r.subject}</TableCell>
            <TableCell><Badge variant={r.severity === "critical" || r.severity === "high" ? "destructive" : "outline"}>{r.severity}</Badge></TableCell>
            <TableCell>
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
              </Select>
            </TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}{rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No complaints</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
  );
};

/* ---------------- Service Requests ---------------- */
const ServiceTab = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ request_type: "endorsement", description: "", priority: "normal", status: "open" });

  const load = async () => { const { data } = await db.from("service_requests").select("*").order("opened_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { error } = await db.from("service_requests").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Request logged" }); setOpen(false); load();
  };
  const setStatus = async (id: string, status: string, opened_at: string) => {
    const patch: any = { status };
    if (status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      patch.tat_hours = (Date.now() - new Date(opened_at).getTime()) / 3_600_000;
    }
    await db.from("service_requests").update(patch).eq("id", id); load();
  };
  const remove = async (id: string) => { await db.from("service_requests").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> New Request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Service Request</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5"><Label>Type</Label><Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="endorsement">Endorsement</SelectItem><SelectItem value="copy">Policy Copy</SelectItem><SelectItem value="nominee">Nominee Change</SelectItem><SelectItem value="address">Address Change</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Opened</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>TAT</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{new Date(r.opened_at).toLocaleDateString()}</TableCell>
            <TableCell>{r.request_type}</TableCell>
            <TableCell><Badge variant={r.priority === "high" ? "destructive" : "outline"}>{r.priority}</Badge></TableCell>
            <TableCell>
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v, r.opened_at)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-xs">{r.tat_hours ? `${Number(r.tat_hours).toFixed(1)} h` : "—"}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}{rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No requests</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
  );
};

/* ---------------- Compliance Tracker ---------------- */
const ComplianceTab = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ agent_name: "", license_no: "", license_type: "IRDAI", issue_date: "", expiry_date: "", status: "active" });

  const load = async () => { const { data } = await db.from("compliance_tracker").select("*").order("expiry_date"); setRows(data ?? []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.agent_name || !form.expiry_date) return toast({ title: "Agent name & expiry required", variant: "destructive" });
    const { error } = await db.from("compliance_tracker").insert({ ...form, company_id: companyId, issue_date: form.issue_date || null });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); load();
  };
  const remove = async (id: string) => { await db.from("compliance_tracker").delete().eq("id", id); load(); };

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add License</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agent License</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Agent Name *</Label><Input value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>License #</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Type</Label><Input value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Expiry Date *</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>License</TableHead><TableHead>Type</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => { const d = daysLeft(r.expiry_date); return (
          <TableRow key={r.id}>
            <TableCell>{r.agent_name}</TableCell>
            <TableCell className="font-mono text-xs">{r.license_no || "—"}</TableCell>
            <TableCell>{r.license_type || "—"}</TableCell>
            <TableCell>{r.expiry_date}</TableCell>
            <TableCell><Badge variant={d < 0 ? "destructive" : d <= 30 ? "secondary" : "outline"}>{d < 0 ? `Expired ${Math.abs(d)}d` : `${d}d`}</Badge></TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        );})}{rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No licenses tracked</TableCell></TableRow>}</TableBody>
      </Table>
    </div>
  );
};

/* ---------------- Tasks ---------------- */
const TasksTab = () => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", description: "", due_date: today(), priority: "normal", status: "pending" });
  const [view, setView] = useState<"list" | "today" | "week">("list");

  const load = async () => { const { data } = await db.from("tasks").select("*").order("due_date"); setRows(data ?? []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title) return toast({ title: "Title required", variant: "destructive" });
    const { error } = await db.from("tasks").insert({ ...form, company_id: companyId, assigned_to: user?.id, created_by: user?.id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Task added" }); setOpen(false); load();
  };
  const toggleDone = async (r: any) => {
    const status = r.status === "completed" ? "pending" : "completed";
    await db.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => { await db.from("tasks").delete().eq("id", id); load(); };

  const t = today();
  const wkEnd = new Date(); wkEnd.setDate(wkEnd.getDate() + 7);
  const wkStr = wkEnd.toISOString().slice(0, 10);
  const filtered = rows.filter((r) => view === "list" ? true : view === "today" ? r.due_date === t : r.due_date && r.due_date >= t && r.due_date <= wkStr);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="list">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> New Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
              </div>
            </div>
            <Button onClick={save} variant="hero">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id} className={`border-l-4 ${r.priority === "high" ? "border-l-destructive" : r.priority === "normal" ? "border-l-primary" : "border-l-muted"}`}>
            <CardContent className="flex items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input type="checkbox" checked={r.status === "completed"} onChange={() => toggleDone(r)} className="h-4 w-4" />
                <div className="min-w-0">
                  <div className={`font-medium ${r.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.due_date || "no due date"} · {r.priority}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-6">No tasks</div>}
      </div>
    </div>
  );
};

/* ---------------- Audit Log ---------------- */
const AuditTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }: any) => setRows(data ?? [])); }, []);
  return (
    <Table>
      <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Table</TableHead><TableHead>Record</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((r) => (
        <TableRow key={r.id}>
          <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
          <TableCell className="font-mono text-xs">{r.user_id?.slice(0, 8) || "—"}</TableCell>
          <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
          <TableCell>{r.table_name || "—"}</TableCell>
          <TableCell className="font-mono text-xs">{r.record_id || "—"}</TableCell>
        </TableRow>
      ))}{rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No audit entries yet</TableCell></TableRow>}</TableBody>
    </Table>
  );
};
