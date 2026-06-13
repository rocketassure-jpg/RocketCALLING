import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Calendar, AlertTriangle } from "lucide-react";
import { daysUntil, expiryBadge } from "@/components/admin/motor/expiry-utils";

type Life = any;

export const LifePanel = () => {
  const { companyId, user } = useAuth();
  const [tab, setTab] = useState("policies");
  const [rows, setRows] = useState<Life[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [planFilter, setPlanFilter] = useState<"all" | "term" | "endowment" | "ulip" | "money_back" | "whole_life">("all");
  const [nomineesOf, setNomineesOf] = useState<Life | null>(null);

  const blankForm = {
    insurer_id: "", policy_number: "", plan_name: "", plan_type: "term",
    policyholder_name: "", policyholder_dob: "", policyholder_phone: "",
    life_assured_name: "", life_assured_dob: "",
    sum_assured: "", policy_term_years: "", premium_paying_term_years: "",
    premium_frequency: "annually", premium_amount: "",
    issue_date: "", commencement_date: "", maturity_date: "", next_due_date: "", last_paid_date: "",
    net_premium: "", gst_amount: "", gross_premium: "",
    status: "active",
  };
  const [form, setForm] = useState<any>(blankForm);

  const load = async () => {
    if (!companyId) return;
    const [pRes, iRes] = await Promise.all([
      supabase.from("life_policies" as any).select("*, insurers(name)").eq("company_id", companyId).order("next_due_date"),
      supabase.from("insurers" as any).select("id,name").eq("company_id", companyId).order("name"),
    ]);
    if (pRes.error) toast({ title: "Failed", description: pRes.error.message, variant: "destructive" });
    setRows((pRes.data as any) || []);
    setInsurers((iRes.data as any) || []);
  };
  useEffect(() => { load(); }, [companyId]);

  const save = async () => {
    if (!companyId) return;
    const num = (v: string) => (v === "" ? null : Number(v));
    const net = num(form.net_premium) || num(form.premium_amount) || 0;
    const gst = num(form.gst_amount) ?? Math.round(net * 0.18 * 100) / 100;
    const gross = num(form.gross_premium) ?? net + gst;
    const payload = {
      ...form, insurer_id: form.insurer_id || null,
      sum_assured: num(form.sum_assured), policy_term_years: num(form.policy_term_years),
      premium_paying_term_years: num(form.premium_paying_term_years), premium_amount: num(form.premium_amount),
      net_premium: net, gst_amount: gst, gross_premium: gross,
      company_id: companyId, created_by: user?.id,
    };
    const { error } = await supabase.from("life_policies" as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Life policy added" });
    setShowAdd(false); setForm(blankForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("life_policies" as any).delete().eq("id", id);
    load();
  };

  const filteredByPlan = planFilter === "all" ? rows : rows.filter((r) => r.plan_type === planFilter);
  const dueSoon = rows.filter((r) => { const d = daysUntil(r.next_due_date); return r.status === "active" && d !== null && d >= 0 && d <= 30; });
  const lapsed = rows.filter((r) => r.status === "lapsed" || (r.next_due_date && daysUntil(r.next_due_date)! < -(r.grace_period_days || 30)));

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Life Insurance</h2>
        <p className="text-sm text-muted-foreground">Term, endowment, ULIP, money back and whole-life policies.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Policies" value={rows.length} />
        <KPI label="Active" value={rows.filter((r) => r.status === "active").length} tone="emerald" />
        <KPI label="Due ≤30d" value={dueSoon.length} tone="amber" />
        <KPI label="Lapsed" value={lapsed.length} tone="red" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Premium Calendar</TabsTrigger>
          <TabsTrigger value="lapsed"><AlertTriangle className="h-4 w-4 mr-1" />Lapsed</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle>Policies ({rows.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="term">Term</TabsTrigger>
                    <TabsTrigger value="endowment">Endowment</TabsTrigger>
                    <TabsTrigger value="ulip">ULIP</TabsTrigger>
                    <TabsTrigger value="money_back">Money Back</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button size="sm" onClick={() => setShowAdd((s) => !s)}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAdd && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                  <div><Label>Insurer</Label>
                    <Select value={form.insurer_id} onValueChange={(v) => setForm({ ...form, insurer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Policy No</Label><Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></div>
                  <div><Label>Plan Name</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} /></div>
                  <div><Label>Plan Type</Label>
                    <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="term">Term</SelectItem>
                        <SelectItem value="endowment">Endowment</SelectItem>
                        <SelectItem value="ulip">ULIP</SelectItem>
                        <SelectItem value="money_back">Money Back</SelectItem>
                        <SelectItem value="whole_life">Whole Life</SelectItem>
                        <SelectItem value="pension">Pension</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Policyholder</Label><Input value={form.policyholder_name} onChange={(e) => setForm({ ...form, policyholder_name: e.target.value })} /></div>
                  <div><Label>Policyholder DOB</Label><Input type="date" value={form.policyholder_dob} onChange={(e) => setForm({ ...form, policyholder_dob: e.target.value })} /></div>
                  <div><Label>Policyholder Phone</Label><Input value={form.policyholder_phone} onChange={(e) => setForm({ ...form, policyholder_phone: e.target.value })} /></div>
                  <div><Label>Life Assured</Label><Input value={form.life_assured_name} onChange={(e) => setForm({ ...form, life_assured_name: e.target.value })} /></div>
                  <div><Label>Life Assured DOB</Label><Input type="date" value={form.life_assured_dob} onChange={(e) => setForm({ ...form, life_assured_dob: e.target.value })} /></div>
                  <div><Label>Sum Assured</Label><Input type="number" value={form.sum_assured} onChange={(e) => setForm({ ...form, sum_assured: e.target.value })} /></div>
                  <div><Label>Policy Term (yrs)</Label><Input type="number" value={form.policy_term_years} onChange={(e) => setForm({ ...form, policy_term_years: e.target.value })} /></div>
                  <div><Label>PPT (yrs)</Label><Input type="number" value={form.premium_paying_term_years} onChange={(e) => setForm({ ...form, premium_paying_term_years: e.target.value })} /></div>
                  <div><Label>Frequency</Label>
                    <Select value={form.premium_frequency} onValueChange={(v) => setForm({ ...form, premium_frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["monthly", "quarterly", "half_yearly", "annually", "single"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Premium Amount</Label><Input type="number" value={form.premium_amount} onChange={(e) => setForm({ ...form, premium_amount: e.target.value })} /></div>
                  <div><Label>Commencement</Label><Input type="date" value={form.commencement_date} onChange={(e) => setForm({ ...form, commencement_date: e.target.value })} /></div>
                  <div><Label>Maturity</Label><Input type="date" value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} /></div>
                  <div><Label>Next Due</Label><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></div>
                  <div><Label>Last Paid</Label><Input type="date" value={form.last_paid_date} onChange={(e) => setForm({ ...form, last_paid_date: e.target.value })} /></div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["active", "lapsed", "paid_up", "surrendered", "matured", "claimed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
                </div>
              )}
              <PoliciesTable rows={filteredByPlan} onRemove={remove} onNominees={(r) => setNomineesOf(r)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <PremiumCalendarView rows={rows.filter((r) => r.status === "active" && r.next_due_date)} />
        </TabsContent>

        <TabsContent value="lapsed" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Lapsed Policies ({lapsed.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Policyholder</TableHead><TableHead>Policy No</TableHead><TableHead>Insurer</TableHead>
                  <TableHead>Last Paid</TableHead><TableHead>Revival Deadline</TableHead><TableHead>Days Left</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lapsed.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No lapsed policies</TableCell></TableRow>) :
                   lapsed.map((r) => {
                     const lapsedDate = r.lapsed_on || r.next_due_date;
                     const deadline = lapsedDate ? new Date(new Date(lapsedDate).getTime() + (r.revival_window_days || 1095) * 86400000).toISOString().slice(0, 10) : null;
                     const left = daysUntil(deadline);
                     return (
                       <TableRow key={r.id}>
                         <TableCell>{r.policyholder_name || "—"}</TableCell>
                         <TableCell className="font-mono text-xs">{r.policy_number || "—"}</TableCell>
                         <TableCell>{r.insurers?.name || "—"}</TableCell>
                         <TableCell>{r.last_paid_date || "—"}</TableCell>
                         <TableCell>{deadline || "—"}</TableCell>
                         <TableCell>{left !== null ? (left > 0 ? <Badge className="bg-amber-500 text-white">{left}d</Badge> : <Badge variant="destructive">Expired</Badge>) : "—"}</TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!nomineesOf} onOpenChange={(o) => !o && setNomineesOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nominees · {nomineesOf?.policy_number || nomineesOf?.plan_name}</DialogTitle></DialogHeader>
          {nomineesOf && <NomineesEditor policy={nomineesOf} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KPI = ({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" | "red" }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-destructive" : ""}`}>{value}</div>
  </CardContent></Card>
);

const PoliciesTable = ({ rows, onRemove, onNominees }: any) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader><TableRow>
        <TableHead>Policyholder</TableHead><TableHead>Plan</TableHead><TableHead>Insurer</TableHead>
        <TableHead>Policy No</TableHead><TableHead className="text-right">Sum Assured</TableHead>
        <TableHead className="text-right">Premium</TableHead><TableHead>Next Due</TableHead>
        <TableHead>Status</TableHead><TableHead></TableHead><TableHead></TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.length === 0 ? (<TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No policies</TableCell></TableRow>) :
         rows.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell>{r.policyholder_name || "—"}<div className="text-xs text-muted-foreground">{r.policyholder_phone || ""}</div></TableCell>
            <TableCell><Badge variant="outline">{r.plan_type}</Badge><div className="text-xs">{r.plan_name || ""}</div></TableCell>
            <TableCell>{r.insurers?.name || "—"}</TableCell>
            <TableCell className="font-mono text-xs">{r.policy_number || "—"}</TableCell>
            <TableCell className="text-right">₹{Number(r.sum_assured || 0).toLocaleString()}</TableCell>
            <TableCell className="text-right">₹{Number(r.premium_amount || 0).toLocaleString()}<div className="text-xs text-muted-foreground">{r.premium_frequency}</div></TableCell>
            <TableCell>{expiryBadge(r.next_due_date)}</TableCell>
            <TableCell><Badge variant={r.status === "active" ? "default" : r.status === "lapsed" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
            <TableCell><Button variant="outline" size="sm" onClick={() => onNominees(r)}><Users className="h-3 w-3 mr-1" />Nom.</Button></TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const PremiumCalendarView = ({ rows }: { rows: any[] }) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const monthLabel = base.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const inMonth = rows.filter((r) => {
    if (!r.next_due_date) return false;
    const d = new Date(r.next_due_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const total = inMonth.reduce((s, r) => s + Number(r.premium_amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Premium Calendar · {monthLabel}</CardTitle>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(monthOffset - 1)}>←</Button>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(0)}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(monthOffset + 1)}>→</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-sm">
          <strong>{inMonth.length}</strong> due · Total <strong>₹{total.toLocaleString()}</strong>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Due Date</TableHead><TableHead>Policyholder</TableHead><TableHead>Insurer</TableHead>
            <TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {inMonth.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nothing due this month</TableCell></TableRow>) :
             inMonth.sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.next_due_date}</TableCell>
                <TableCell>{r.policyholder_name || "—"}</TableCell>
                <TableCell>{r.insurers?.name || "—"}</TableCell>
                <TableCell>{r.plan_type}</TableCell>
                <TableCell className="text-right">₹{Number(r.premium_amount || 0).toLocaleString()}</TableCell>
                <TableCell>{expiryBadge(r.next_due_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const NomineesEditor = ({ policy }: { policy: any }) => {
  const { companyId } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ nominee_name: "", relationship: "spouse", share_percent: "100", date_of_birth: "", is_minor: false, appointee_name: "" });
  const load = async () => {
    const { data } = await supabase.from("life_nominees" as any).select("*").eq("policy_id", policy.id);
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, [policy.id]);
  const add = async () => {
    if (!form.nominee_name) return;
    await supabase.from("life_nominees" as any).insert({
      ...form, share_percent: Number(form.share_percent),
      policy_id: policy.id, company_id: companyId,
    });
    setForm({ nominee_name: "", relationship: "spouse", share_percent: "100", date_of_birth: "", is_minor: false, appointee_name: "" });
    load();
  };
  const del = async (id: string) => { await supabase.from("life_nominees" as any).delete().eq("id", id); load(); };
  const totalShare = list.reduce((s, n) => s + Number(n.share_percent || 0), 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Input placeholder="Nominee Name" value={form.nominee_name} onChange={(e) => setForm({ ...form, nominee_name: e.target.value })} />
        <Input placeholder="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
        <Input type="number" placeholder="Share %" value={form.share_percent} onChange={(e) => setForm({ ...form, share_percent: e.target.value })} />
        <Input type="date" placeholder="DOB" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
      </div>
      <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add Nominee</Button>
      <div className="text-xs text-muted-foreground">Total share: <strong className={totalShare !== 100 && list.length > 0 ? "text-destructive" : "text-emerald-600"}>{totalShare}%</strong> {totalShare !== 100 && list.length > 0 && "(should equal 100)"}</div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Relation</TableHead><TableHead>DOB</TableHead><TableHead>Share</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {list.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No nominees</TableCell></TableRow>) :
           list.map((n) => (
            <TableRow key={n.id}>
              <TableCell>{n.nominee_name}</TableCell><TableCell>{n.relationship}</TableCell>
              <TableCell>{n.date_of_birth || "—"}</TableCell><TableCell>{n.share_percent}%</TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => del(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
