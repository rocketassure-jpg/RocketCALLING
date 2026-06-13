import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Loader2, ShieldCheck, LogOut, Copy, LayoutDashboard, Megaphone, Settings as SettingsIcon, Flag, Layers, ShieldAlert, KeyRound, UserCog, TrendingUp, Users, Phone, IndianRupee, Database } from "lucide-react";
import { GlobalSettingsPanel, FeatureFlagsPanel, AnnouncementsPanel, PlanTemplatesPanel, SuperAdminAuditPanel } from "@/components/super-admin/SuperAdminPanels";
import { DataExplorerPanel } from "@/components/super-admin/DataExplorerPanel";

type Company = { id: string; name: string; code: string; plan: string; is_active: boolean; created_at: string };
type Module = { module_key: string; name: string; base_monthly_price: number; is_always_included: boolean; sort_order: number };
type Subscription = { id: string; company_id: string; module_key: string; billing_cycle: string; status: string; end_date: string | null };
type Plan = { id: string; plan_name: string; monthly_price: number };

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "data", label: "Data Explorer", icon: Database },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "settings", label: "Global Settings", icon: SettingsIcon },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "plans", label: "Plan Templates", icon: Layers },
  { id: "audit", label: "Audit Log", icon: ShieldAlert },
];

const SuperAdminDashboard = () => {
  const { signOut, user } = useAuth();
  const [section, setSection] = useState("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [profilesCount, setProfilesCount] = useState({ total: 0, active: 0 });
  const [callsToday, setCallsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCo, setNewCo] = useState({ name: "", code: "", plan: "Custom", trial_days: 14 });

  const load = async () => {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [c, m, s, p, pf, cl] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.from("company_subscriptions").select("*"),
      supabase.from("plan_templates").select("id,plan_name,monthly_price").order("sort_order"),
      supabase.from("profiles").select("id,is_active", { count: "exact" }),
      supabase.from("call_logs").select("id", { count: "exact", head: true }).gte("called_at", todayStart.toISOString()),
    ]);
    setCompanies((c.data ?? []) as any);
    setModules((m.data ?? []) as any);
    setSubs((s.data ?? []) as any);
    setPlans((p.data ?? []) as any);
    setProfilesCount({ total: pf.count ?? 0, active: (pf.data ?? []).filter((x: any) => x.is_active).length });
    setCallsToday(cl.count ?? 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const subsFor = (companyId: string) => subs.filter((s) => s.company_id === companyId);

  const createCompany = async () => {
    if (!newCo.name || !newCo.code) return toast({ title: "Name + code required", variant: "destructive" });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://lgqgnsngxhqdzpstiddj.supabase.co/functions/v1/super-admin-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: "create_company", name: newCo.name, code: newCo.code, plan: newCo.plan, trial_days: newCo.trial_days }),
    });
    const j = await res.json();
    if (!res.ok) return toast({ title: "Failed", description: j.error, variant: "destructive" });
    toast({ title: "Company created", description: `Signup: ${j.signup_url}` });
    setCreating(false); setNewCo({ name: "", code: "", plan: "Custom", trial_days: 14 });
    load();
  };

  const toggleModule = async (companyId: string, moduleKey: string, currentSub: Subscription | undefined) => {
    if (currentSub) {
      await supabase.from("company_subscriptions").delete().eq("id", currentSub.id);
    } else {
      await supabase.from("company_subscriptions").insert({ company_id: companyId, module_key: moduleKey, billing_cycle: "monthly", status: "active" });
    }
    await supabase.from("super_admin_audit_log").insert({
      super_admin_id: user?.id, action_type: currentSub ? "module_suspended" : "module_activated",
      target_company_id: companyId, description: `${currentSub ? "Disabled" : "Enabled"} ${moduleKey}`,
    });
    load();
  };

  const updateSub = async (subId: string, patch: Partial<Subscription>) => {
    await supabase.from("company_subscriptions").update(patch as any).eq("id", subId);
    load();
  };

  const toggleCompanyActive = async (co: Company) => {
    await supabase.from("companies").update({ is_active: !co.is_active }).eq("id", co.id);
    await supabase.from("super_admin_audit_log").insert({
      super_admin_id: user?.id, action_type: co.is_active ? "company_suspended" : "company_activated",
      target_company_id: co.id, description: `${co.is_active ? "Suspended" : "Activated"} ${co.name}`,
    });
    load();
  };

  const impersonate = async (co: Company) => {
    const { data: adminProf } = await supabase.from("profiles").select("id,full_name").eq("company_id", co.id).limit(1).maybeSingle();
    if (!adminProf) return toast({ title: "No user found in this company", variant: "destructive" });
    const reason = window.prompt(`Impersonate ${adminProf.full_name}? Reason:`);
    if (!reason) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://lgqgnsngxhqdzpstiddj.supabase.co/functions/v1/super-admin-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: "impersonate", target_user_id: adminProf.id, reason, redirect_to: `${window.location.origin}/dashboard` }),
    });
    const j = await res.json();
    if (!res.ok) return toast({ title: "Failed", description: j.error, variant: "destructive" });
    window.open(j.action_link, "_blank");
    toast({ title: "Impersonation link opened in new tab" });
  };

  const resetUserPwd = async () => {
    const email = window.prompt("User email:");
    if (!email) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://lgqgnsngxhqdzpstiddj.supabase.co/functions/v1/super-admin-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: "reset_password", email }),
    });
    const j = await res.json();
    if (!res.ok) return toast({ title: "Failed", description: j.error, variant: "destructive" });
    navigator.clipboard.writeText(j.action_link);
    toast({ title: "Reset link copied to clipboard" });
  };

  // KPIs
  const activeCo = companies.filter((c) => c.is_active).length;
  const suspended = companies.length - activeCo;
  const mrr = useMemo(() => {
    let total = 0;
    subs.forEach((s) => {
      if (s.status !== "active" || s.billing_cycle === "lifetime" || s.billing_cycle === "trial") return;
      const m = modules.find((mm) => mm.module_key === s.module_key);
      if (!m) return;
      total += s.billing_cycle === "yearly" ? (Number(m.base_monthly_price) / 12) : Number(m.base_monthly_price);
    });
    return Math.round(total);
  }, [subs, modules]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900">
        <div className="container flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><Logo /><Badge variant="destructive">Super Admin</Badge></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetUserPwd} className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"><KeyRound className="h-4 w-4" /> Reset User</Button>
            <Button variant="outline" size="sm" onClick={signOut} className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <div className="container grid gap-4 px-3 py-4 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${section === s.id ? "bg-primary text-primary-foreground" : "text-slate-300 hover:bg-slate-800"}`}>
                <s.icon className="h-4 w-4" /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4 min-w-0">
          <div className="rounded-xl bg-background p-4 text-foreground">
            {section === "dashboard" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KPI icon={Building2} label="Companies" value={`${activeCo}`} sub={`${suspended} suspended`} color="from-blue-500 to-blue-600" />
                  <KPI icon={Users} label="Users" value={`${profilesCount.total}`} sub={`${profilesCount.active} active`} color="from-emerald-500 to-emerald-600" />
                  <KPI icon={Phone} label="Calls Today" value={`${callsToday}`} sub="across platform" color="from-orange-500 to-orange-600" />
                  <KPI icon={IndianRupee} label="MRR (est.)" value={`₹${mrr.toLocaleString("en-IN")}`} sub="active subscriptions" color="from-purple-500 to-fuchsia-600" />
                </div>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Module Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Companies</TableHead><TableHead>Active Subs</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {modules.map((m) => {
                          const ms = subs.filter((s) => s.module_key === m.module_key && s.status === "active");
                          return <TableRow key={m.module_key}><TableCell>{m.name}</TableCell><TableCell>{new Set(ms.map((x) => x.company_id)).size}</TableCell><TableCell>{ms.length}</TableCell></TableRow>;
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "companies" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Companies ({companies.length})</CardTitle>
                  <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New Company</Button>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {loading ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Plan</TableHead>
                        <TableHead>Modules</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {companies.map((co) => (
                          <TableRow key={co.id}>
                            <TableCell className="font-medium">{co.name}</TableCell>
                            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{co.code}</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => { navigator.clipboard.writeText(co.code); toast({ title: "Code copied" }); }}><Copy className="h-3 w-3" /></Button>
                            </TableCell>
                            <TableCell><Badge variant="outline">{co.plan}</Badge></TableCell>
                            <TableCell>{subsFor(co.id).length}/{modules.length}</TableCell>
                            <TableCell>{co.is_active ? <Badge>Active</Badge> : <Badge variant="destructive">Suspended</Badge>}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="outline" onClick={() => setSelected(co)}>Manage</Button>
                              <Button size="sm" variant="outline" onClick={() => impersonate(co)}><UserCog className="h-3 w-3" /> Login As</Button>
                              <Button size="sm" variant={co.is_active ? "destructive" : "default"} onClick={() => toggleCompanyActive(co)}>{co.is_active ? "Suspend" : "Activate"}</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {section === "data" && <DataExplorerPanel />}
            {section === "announcements" && <AnnouncementsPanel />}
            {section === "settings" && <GlobalSettingsPanel />}
            {section === "flags" && <FeatureFlagsPanel />}
            {section === "plans" && <PlanTemplatesPanel />}
            {section === "audit" && <SuperAdminAuditPanel />}
          </div>
        </main>
      </div>

      {/* New Company Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create company</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newCo.name} onChange={(e) => setNewCo({ ...newCo, name: e.target.value })} placeholder="XYZ Insurance Broker" /></div>
            <div><Label>Code (signup key)</Label><Input value={newCo.code} onChange={(e) => setNewCo({ ...newCo, code: e.target.value.toUpperCase() })} placeholder="XYZBROKER" /></div>
            <div><Label>Plan</Label>
              <Select value={newCo.plan} onValueChange={(v) => setNewCo({ ...newCo, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.plan_name}>{p.plan_name} — ₹{p.monthly_price}/mo</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Trial Days</Label><Input type="number" value={newCo.trial_days} onChange={(e) => setNewCo({ ...newCo, trial_days: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={createCompany}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Management Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{selected.name} — Subscription & Modules</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {modules.map((m) => {
                const sub = subsFor(selected.id).find((s) => s.module_key === m.module_key);
                const enabled = !!sub;
                return (
                  <div key={m.module_key} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">{m.name}{m.is_always_included && <Badge variant="secondary" className="text-[10px]">Always</Badge>}</div>
                      <div className="text-xs text-muted-foreground">{m.module_key} • ₹{m.base_monthly_price}/mo</div>
                    </div>
                    <Select value={sub?.billing_cycle ?? "monthly"} disabled={!enabled} onValueChange={(v) => sub && updateSub(sub.id, { billing_cycle: v })}>
                      <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem><SelectItem value="lifetime">Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" className="w-36 h-8" value={sub?.end_date ?? ""} disabled={!enabled} onChange={(e) => sub && updateSub(sub.id, { end_date: e.target.value || null })} />
                    <Badge variant={enabled ? "default" : "outline"}>{enabled ? sub!.status : "off"}</Badge>
                    <Switch checked={enabled} onCheckedChange={() => toggleModule(selected.id, m.module_key, sub)} disabled={m.is_always_included && enabled} />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const KPI = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <div className={`bg-gradient-to-br ${color} p-4 text-white`}>
        <Icon className="h-5 w-5 opacity-80" />
        <div className="mt-3 text-xs opacity-90">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        <div className="text-[10px] opacity-80">{sub}</div>
      </div>
    </CardContent>
  </Card>
);

export default SuperAdminDashboard;
