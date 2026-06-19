import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, AlertTriangle, FileText, ShieldAlert, ListChecks, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Claim360Dialog } from "./Claim360Dialog";
import { WORKFLOW_STAGES, SUB_CATEGORIES, POLICY_TYPES, stageLabel, agingBucket, agingColor, stageStep } from "./claims-utils";

const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "settled") return "default";
  if (s === "rejected") return "destructive";
  if (s === "closed") return "outline";
  return "secondary";
};

export function ClaimsPanel() {
  const { toast } = useToast();
  const { companyId } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open360, setOpen360] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAging, setFilterAging] = useState<string>("all");
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<any>({
    claim_number: "", policy_type: "motor", claim_type: "", sub_category: "",
    incident_date: "", intimation_date: new Date().toISOString().slice(0, 10),
    claim_amount: "", status: "intimated", insurer_id: "", customer_id: "", remarks: "",
  });

  const load = async () => {
    setLoading(true);
    const [c, ins, cust] = await Promise.all([
      supabase.from("claims").select("*").order("created_at", { ascending: false }),
      supabase.from("insurers").select("id,name").order("name"),
      supabase.from("customers").select("id,full_name").order("full_name").limit(500),
    ]);
    setClaims(c.data ?? []);
    setInsurers((ins.data as any) ?? []);
    setCustomers(((cust.data as any) ?? []).map((x: any) => ({ id: x.id, name: x.full_name })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.claim_number) return toast({ title: "Claim number required", variant: "destructive" });
    const payload: any = {
      ...form, company_id: companyId,
      incident_date: form.incident_date || null, intimation_date: form.intimation_date || null,
      claim_amount: Number(form.claim_amount) || 0,
      insurer_id: form.insurer_id || null, customer_id: form.customer_id || null,
      sub_category: form.sub_category || null,
    };
    const { error } = await supabase.from("claims").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Claim created" });
    setNewOpen(false);
    setForm({ ...form, claim_number: "", claim_type: "", sub_category: "", claim_amount: "", remarks: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this claim?")) return;
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const filtered = useMemo(() => claims.filter((c) =>
    (filterType === "all" || c.policy_type === filterType) &&
    (filterStatus === "all" || c.status === filterStatus) &&
    (filterAging === "all" || agingBucket(c.intimation_date) === filterAging) &&
    (!q.trim() || (c.claim_number + " " + (c.claim_type ?? "")).toLowerCase().includes(q.toLowerCase()))
  ), [claims, filterType, filterStatus, filterAging, q]);

  const kpis = useMemo(() => {
    const o = claims.filter((c) => !["settled", "closed", "rejected"].includes(c.status));
    return {
      total: claims.length,
      open: o.length,
      pendingDocs: claims.filter((c) => c.status === "documents_pending").length,
      pendingSurvey: claims.filter((c) => c.status === "surveyor_assigned").length,
      pendingApproval: claims.filter((c) => c.status === "approval_pending").length,
      settled: claims.filter((c) => c.status === "settled").length,
      breached: claims.filter((c) => c.sla_breached).length,
    };
  }, [claims]);

  const agingCounts = useMemo(() => {
    const buckets = ["0-7 Days", "8-15 Days", "16-30 Days", "31-60 Days", "60+ Days"];
    return buckets.map((b) => ({ bucket: b, count: claims.filter((c) => !["settled", "closed"].includes(c.status) && agingBucket(c.intimation_date) === b).length }));
  }, [claims]);

  const openClaim = (id: string) => { setActive(id); setOpen360(true); };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        <Kpi label="Total" value={kpis.total} icon={<FileText className="h-4 w-4" />} />
        <Kpi label="Open" value={kpis.open} icon={<ListChecks className="h-4 w-4" />} tone="amber" />
        <Kpi label="Pending Docs" value={kpis.pendingDocs} icon={<FileText className="h-4 w-4" />} />
        <Kpi label="Pending Survey" value={kpis.pendingSurvey} icon={<ClipboardCheck className="h-4 w-4" />} />
        <Kpi label="Pending Approval" value={kpis.pendingApproval} icon={<ShieldAlert className="h-4 w-4" />} />
        <Kpi label="Settled" value={kpis.settled} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <Kpi label="SLA Breached" value={kpis.breached} icon={<AlertTriangle className="h-4 w-4" />} tone="red" />
      </div>

      {/* Aging buckets */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Claim Aging (Open Claims)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {agingCounts.map((a) => (
              <button key={a.bucket} onClick={() => setFilterAging(filterAging === a.bucket ? "all" : a.bucket)}
                className={`rounded-md border px-3 py-2 text-xs transition-all ${filterAging === a.bucket ? "ring-2 ring-primary" : ""} ${agingColor(a.bucket)}`}>
                <div className="font-semibold">{a.bucket}</div>
                <div className="text-lg font-bold">{a.count}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters + new */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Claims ({filtered.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="h-9 w-44 pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {POLICY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {WORKFLOW_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="hero" size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New Claim</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Claim #</TableHead><TableHead>Type</TableHead><TableHead>Sub</TableHead>
              <TableHead>Stage</TableHead><TableHead>Progress</TableHead><TableHead>Aging</TableHead>
              <TableHead>Amount</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              : !filtered.length ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No claims match.</TableCell></TableRow>
              : filtered.map((c) => {
                const step = stageStep(c.status);
                const bucket = agingBucket(c.intimation_date);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openClaim(c.id)}>
                    <TableCell className="font-medium">{c.claim_number}{c.sla_breached && <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{c.policy_type}</Badge></TableCell>
                    <TableCell className="text-xs">{c.sub_category || c.claim_type || "—"}</TableCell>
                    <TableCell><Badge variant={statusColor(c.status)}>{stageLabel(c.status)}</Badge></TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${step * 10}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{step}/10</span>
                      </div>
                    </TableCell>
                    <TableCell><span className={`rounded px-2 py-0.5 text-xs ${agingColor(bucket)}`}>{bucket}</span></TableCell>
                    <TableCell>₹{Number(c.claim_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New claim dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Claim</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Claim Number *</Label><Input value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
            <div><Label>Policy Type</Label>
              <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v, sub_category: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POLICY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sub Category</Label>
              <Select value={form.sub_category} onValueChange={(v) => setForm({ ...form, sub_category: v })}>
                <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                <SelectContent>{(SUB_CATEGORIES[form.policy_type] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Initial Stage</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKFLOW_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date of Loss</Label><Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></div>
            <div><Label>Date of Intimation</Label><Input type="date" value={form.intimation_date} onChange={(e) => setForm({ ...form, intimation_date: e.target.value })} /></div>
            <div><Label>Claim Amount</Label><Input type="number" value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} /></div>
            <div><Label>Insurance Company</Label>
              <Select value={form.insurer_id || "none"} onValueChange={(v) => setForm({ ...form, insurer_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Customer</Label>
              <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={save}>Create — open Claim 360</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Claim360Dialog claimId={active} open={open360} onOpenChange={setOpen360} onSaved={load} />
    </div>
  );
}

const Kpi = ({ label, value, icon, tone }: { label: string; value: number; icon: any; tone?: "amber" | "green" | "red" }) => {
  const cls = tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-600" : tone === "red" ? "text-destructive" : "";
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">{label}{icon}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
