import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, ClipboardList } from "lucide-react";

const STATUS_OPTIONS = ["received", "docs_pending", "submitted", "under_process", "approved", "dispatched", "completed", "rejected", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-500",
  docs_pending: "bg-amber-500",
  submitted: "bg-indigo-500",
  under_process: "bg-purple-500",
  approved: "bg-emerald-500",
  dispatched: "bg-teal-500",
  completed: "bg-green-600",
  rejected: "bg-red-600",
  cancelled: "bg-gray-500",
};

export const RtoPanel = () => {
  const { companyId, user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [docsOf, setDocsOf] = useState<any | null>(null);
  const [historyOf, setHistoryOf] = useState<any | null>(null);

  const blank = {
    service_type_id: "", customer_name: "", customer_phone: "",
    application_number: "", rto_office: "",
    govt_fees: "", service_charge: "", total_charges: "",
    amount_collected: "", payment_status: "pending",
    received_date: new Date().toISOString().slice(0, 10),
    expected_completion_date: "", notes: "",
  };
  const [form, setForm] = useState<any>(blank);

  const load = async () => {
    if (!companyId) return;
    const [sRes, cRes] = await Promise.all([
      supabase.from("rto_service_types" as any).select("*").eq("is_active", true).order("category").order("name"),
      supabase.from("rto_cases" as any).select("*, rto_service_types(name, category, code)").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    if (sRes.error) toast({ title: "Failed", description: sRes.error.message, variant: "destructive" });
    setServices((sRes.data as any) || []);
    setCases((cRes.data as any) || []);
  };
  useEffect(() => { load(); }, [companyId]);

  // auto-fill fees from selected service
  useEffect(() => {
    if (!form.service_type_id) return;
    const s = services.find((x) => x.id === form.service_type_id);
    if (s) {
      setForm((f: any) => ({
        ...f,
        govt_fees: f.govt_fees || s.govt_fees,
        service_charge: f.service_charge || s.service_charge,
        total_charges: f.total_charges || (Number(s.govt_fees) + Number(s.service_charge)),
        expected_completion_date: f.expected_completion_date || new Date(Date.now() + (s.estimated_days || 7) * 86400000).toISOString().slice(0, 10),
      }));
    }
  }, [form.service_type_id, services]);

  const categories = useMemo(() => Array.from(new Set(services.map((s) => s.category))).sort(), [services]);

  const save = async () => {
    if (!companyId || !form.service_type_id) return toast({ title: "Select a service", variant: "destructive" });
    const num = (v: string) => (v === "" ? 0 : Number(v));
    const payload = {
      ...form,
      govt_fees: num(form.govt_fees), service_charge: num(form.service_charge),
      total_charges: num(form.total_charges) || num(form.govt_fees) + num(form.service_charge),
      amount_collected: num(form.amount_collected),
      company_id: companyId, created_by: user?.id,
    };
    const { error } = await supabase.from("rto_cases" as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Case created · checklist auto-generated" });
    setShowAdd(false); setForm(blank); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("rto_cases" as any).update({ status }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete case and all its documents/history?")) return;
    await supabase.from("rto_cases" as any).delete().eq("id", id);
    load();
  };

  const filtered = cases.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.rto_service_types?.category !== categoryFilter) return false;
    return true;
  });

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: cases.length };
    STATUS_OPTIONS.forEach((s) => (m[s] = cases.filter((c) => c.status === s).length));
    return m;
  }, [cases]);

  const totals = useMemo(() => ({
    revenue: cases.reduce((s, c) => s + Number(c.amount_collected || 0), 0),
    pendingRevenue: cases.reduce((s, c) => s + (Number(c.total_charges || 0) - Number(c.amount_collected || 0)), 0),
    inProgress: cases.filter((c) => !["completed", "rejected", "cancelled"].includes(c.status)).length,
  }), [cases]);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">RTO Services</h2>
        <p className="text-sm text-muted-foreground">License, registration, transfer, fitness, permits and more.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Cases" value={cases.length.toString()} />
        <KPI label="In Progress" value={totals.inProgress.toString()} tone="amber" />
        <KPI label="Revenue Collected" value={`₹${totals.revenue.toLocaleString()}`} tone="emerald" />
        <KPI label="Pending Collection" value={`₹${totals.pendingRevenue.toLocaleString()}`} tone="red" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Cases ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />New Case</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              {STATUS_OPTIONS.map((s) => (
                <TabsTrigger key={s} value={s}>{s.replace(/_/g, " ")} ({statusCounts[s]})</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Service</TableHead>
                <TableHead>App No</TableHead><TableHead>Received</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Collected</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No cases</TableCell></TableRow>) :
                 filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.customer_name || "—"}<div className="text-xs text-muted-foreground">{c.customer_phone || ""}</div></TableCell>
                    <TableCell><div className="font-medium">{c.rto_service_types?.name || "—"}</div><Badge variant="outline" className="text-[10px]">{c.rto_service_types?.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{c.application_number || "—"}</TableCell>
                    <TableCell className="text-xs">{c.received_date}<div className="text-muted-foreground">→ {c.expected_completion_date || "—"}</div></TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[c.status] || "bg-gray-400"}`} />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">₹{Number(c.total_charges || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={Number(c.amount_collected) >= Number(c.total_charges) ? "text-emerald-600 font-semibold" : ""}>
                        ₹{Number(c.amount_collected || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDocsOf(c)} title="Documents"><ClipboardList className="h-3 w-3" /></Button>
                      <Button variant="outline" size="sm" onClick={() => setHistoryOf(c)} title="History"><FileText className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New RTO Case</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Service *</Label>
              <Select value={form.service_type_id} onValueChange={(v) => setForm({ ...form, service_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">{cat.replace(/_/g, " ")}</div>
                      {services.filter((s) => s.category === cat).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-xs text-muted-foreground ml-2">₹{Number(s.govt_fees) + Number(s.service_charge)}</span></SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
            <div><Label>Application No</Label><Input value={form.application_number} onChange={(e) => setForm({ ...form, application_number: e.target.value })} /></div>
            <div><Label>RTO Office</Label><Input value={form.rto_office} onChange={(e) => setForm({ ...form, rto_office: e.target.value })} /></div>
            <div><Label>Govt Fees</Label><Input type="number" value={form.govt_fees} onChange={(e) => setForm({ ...form, govt_fees: e.target.value })} /></div>
            <div><Label>Service Charge</Label><Input type="number" value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: e.target.value })} /></div>
            <div><Label>Total Charges</Label><Input type="number" value={form.total_charges} onChange={(e) => setForm({ ...form, total_charges: e.target.value })} /></div>
            <div><Label>Amount Collected</Label><Input type="number" value={form.amount_collected} onChange={(e) => setForm({ ...form, amount_collected: e.target.value })} /></div>
            <div><Label>Received Date</Label><Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
            <div><Label>Expected Completion</Label><Input type="date" value={form.expected_completion_date} onChange={(e) => setForm({ ...form, expected_completion_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="md:col-span-2 flex gap-2"><Button onClick={save}>Create Case</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docsOf} onOpenChange={(o) => !o && setDocsOf(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Document Checklist · {docsOf?.rto_service_types?.name}</DialogTitle></DialogHeader>
          {docsOf && <DocsEditor case_={docsOf} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Status Timeline · {historyOf?.rto_service_types?.name}</DialogTitle></DialogHeader>
          {historyOf && <HistoryView caseId={historyOf.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KPI = ({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" | "red" }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-xl font-bold mt-1 ${tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-destructive" : ""}`}>{value}</div>
  </CardContent></Card>
);

const DocsEditor = ({ case_ }: { case_: any }) => {
  const { companyId } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const load = async () => {
    const { data } = await supabase.from("rto_case_documents" as any).select("*").eq("case_id", case_.id).order("created_at");
    setDocs((data as any) || []);
  };
  useEffect(() => { load(); }, [case_.id]);
  const toggle = async (id: string, field: "is_collected" | "is_verified", value: boolean) => {
    const patch: any = { [field]: value };
    if (field === "is_collected" && value) patch.collected_at = new Date().toISOString();
    await supabase.from("rto_case_documents" as any).update(patch).eq("id", id);
    load();
  };
  const add = async () => {
    if (!newName.trim()) return;
    await supabase.from("rto_case_documents" as any).insert({ company_id: companyId, case_id: case_.id, document_name: newName.trim() });
    setNewName(""); load();
  };
  const del = async (id: string) => { await supabase.from("rto_case_documents" as any).delete().eq("id", id); load(); };
  const collected = docs.filter((d) => d.is_collected).length;
  const verified = docs.filter((d) => d.is_verified).length;
  return (
    <div className="space-y-3">
      <div className="text-sm flex gap-4">
        <span>Collected: <strong>{collected}/{docs.length}</strong></span>
        <span>Verified: <strong className="text-emerald-600">{verified}/{docs.length}</strong></span>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Add document…" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Document</TableHead><TableHead>Required</TableHead>
          <TableHead>Collected</TableHead><TableHead>Verified</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {docs.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No documents</TableCell></TableRow>) :
           docs.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.document_name}</TableCell>
              <TableCell>{d.is_required ? <Badge variant="outline">Required</Badge> : <Badge variant="secondary">Optional</Badge>}</TableCell>
              <TableCell><Checkbox checked={d.is_collected} onCheckedChange={(v) => toggle(d.id, "is_collected", !!v)} /></TableCell>
              <TableCell><Checkbox checked={d.is_verified} onCheckedChange={(v) => toggle(d.id, "is_verified", !!v)} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const HistoryView = ({ caseId }: { caseId: string }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("rto_status_history" as any).select("*").eq("case_id", caseId).order("changed_at", { ascending: false });
      setItems((data as any) || []);
    })();
  }, [caseId]);
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center text-muted-foreground text-sm">No history yet</div>}
      {items.map((h) => (
        <div key={h.id} className="flex items-start gap-3 p-3 border rounded-lg">
          <span className={`mt-1 inline-block w-2 h-2 rounded-full ${STATUS_COLORS[h.to_status] || "bg-gray-400"}`} />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {h.from_status ? `${h.from_status.replace(/_/g, " ")} → ` : ""}{h.to_status.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</div>
            {h.notes && <div className="text-xs mt-1">{h.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
