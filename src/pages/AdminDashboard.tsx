import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, MapPin, Ban, RotateCcw, UserPlus, Copy, LayoutDashboard, Phone, Inbox, Users, Upload, Shield, GraduationCap, Webhook, Lock, Settings, KeyRound, Tags, ListChecks, AlarmClock, Trophy, BarChart3, MessageCircle, Calculator, User, Wallet, Car, HeartPulse, ShieldCheck, Building2 } from "lucide-react";
import { AccountsPanel } from "@/components/admin/accounts/AccountsPanel";
import { MotorPanel } from "@/components/admin/motor/MotorPanel";
import { HealthPanel } from "@/components/admin/health/HealthPanel";
import { LifePanel } from "@/components/admin/life/LifePanel";
import { RtoPanel } from "@/components/admin/rto/RtoPanel";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { CallingList } from "@/components/CallingList";
import { EnquiriesPanel } from "@/components/EnquiriesPanel";
import { WavelengthDashboard } from "@/components/admin/WavelengthDashboard";
import { SmartImportPanel } from "@/components/admin/SmartImportPanel";
import { ApiKeysManager } from "@/components/admin/ApiKeysManager";
import { SecretsManager } from "@/components/admin/SecretsManager";
import { TrainingModule } from "@/components/TrainingModule";
import { GeneralSettings } from "@/components/admin/GeneralSettings";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";
import { CRMFieldsManager } from "@/components/admin/CRMFieldsManager";
import { StatusConfigurator } from "@/components/admin/StatusConfigurator";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { InstallPWA } from "@/components/InstallPWA";
import { BulkActionBar } from "@/components/BulkActionBar";
import { RenewalsPanel } from "@/components/admin/RenewalsPanel";
import { CustomersPanel } from "@/components/admin/CustomersPanel";
import { PerformancePanel } from "@/components/admin/PerformancePanel";
import { WhatsAppBulkMessaging } from "@/components/WhatsAppBulkMessaging";
import { PremiumCalculator } from "@/components/PremiumCalculator";
import { AccountSettings } from "@/components/AccountSettings";
import { PendingApprovalsPanel } from "@/components/admin/PendingApprovalsPanel";
import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { useAuth } from "@/contexts/AuthContext";

type Area = { id: string; name: string };
type Profile = { id: string; full_name: string; manager_id?: string | null };
type Role = { user_id: string; role: "admin" | "manager" | "telecaller" };
type Assignment = { id: string; telecaller_id: string; area_id: string };
type Lead = {
  id: string; customer_name: string; phone_number: string; area_id: string;
  policy_type: "Life" | "Health" | "Motor"; status: string;
  call_date: string; premium_amount: number; assigned_telecaller?: string | null;
  areas?: { name: string } | null;
};
type CallLog = { id: string; lead_id: string; telecaller_id: string; status: string; called_at: string };

const today = () => new Date().toISOString().slice(0, 10);

const BASE_NAV: { id: string; label: string; icon: any; module?: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "dashboard", label: "Wavelength", icon: LayoutDashboard },
  { id: "calling", label: "Calling", icon: Phone },
  { id: "enquiries", label: "Enquiries", icon: Inbox },
  { id: "leads", label: "Leads", icon: Users },
  { id: "accounts", label: "Accounts", icon: Wallet, module: "accounts" },
  { id: "motor", label: "Motor Insurance", icon: Car, module: "motor" },
  { id: "health", label: "Health Insurance", icon: HeartPulse, module: "health" },
  { id: "life", label: "Life Insurance", icon: ShieldCheck, module: "life" },
  { id: "areas", label: "Areas", icon: MapPin },
  { id: "renewals", label: "Renewals", icon: AlarmClock },
  { id: "customers", label: "Customers", icon: Trophy },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "team", label: "Team", icon: Shield },
  { id: "approvals", label: "Pending Approvals", icon: UserPlus },
  { id: "import", label: "Import", icon: Upload },
  { id: "messaging", label: "WhatsApp", icon: MessageCircle },
  { id: "calculator", label: "Premium Calculator", icon: Calculator },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "api", label: "API & Webhooks", icon: Webhook },
  { id: "secrets", label: "API Keys", icon: Lock },
  { id: "account", label: "Account Settings", icon: User },
  { id: "settings", label: "General", icon: Settings },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "fields", label: "CRM Fields", icon: Tags },
  { id: "statuses", label: "Statuses", icon: ListChecks },
  { id: "trash", label: "Trash (DNC)", icon: Ban },
];

const AdminDashboard = () => {
  const { companyId } = useAuth();
  const { has: hasModule } = useModuleAccess();
  const NAV = useMemo(() => BASE_NAV.filter((n) => !n.module || hasModule(n.module as any)), [hasModule]);
  const [section, setSection] = useState("overview");
  const [areas, setAreas] = useState<Area[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [newArea, setNewArea] = useState("");
  const [assignT, setAssignT] = useState("");
  const [assignA, setAssignA] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Invite form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "telecaller">("telecaller");

  const load = async () => {
    const [a, p, r, ta, l, cl] = await Promise.all([
      supabase.from("areas").select("*").order("name"),
      supabase.from("profiles").select("id,full_name,manager_id"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("telecaller_areas").select("*"),
      supabase.from("leads").select("id,customer_name,phone_number,area_id,policy_type,status,call_date,premium_amount,assigned_telecaller, areas(name)").order("created_at", { ascending: false }),
      supabase.from("call_logs").select("id,lead_id,telecaller_id,status,called_at").order("called_at", { ascending: false }),
    ]);
    setAreas(a.data ?? []); setProfiles(p.data ?? []); setRoles((r.data ?? []) as any);
    setAssignments(ta.data ?? []); setLeads((l.data ?? []) as any); setCallLogs((cl.data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const telecallers = useMemo(() => { const ids = new Set(roles.filter((r) => r.role === "telecaller").map((r) => r.user_id)); return profiles.filter((x) => ids.has(x.id)); }, [profiles, roles]);
  const managers = useMemo(() => { const ids = new Set(roles.filter((r) => r.role === "manager").map((r) => r.user_id)); return profiles.filter((x) => ids.has(x.id)); }, [profiles, roles]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const lastDispoMap = useMemo(() => {
    const m = new Map<string, CallLog>();
    callLogs.forEach((c) => { if (!m.has(c.lead_id)) m.set(c.lead_id, c); });
    return m;
  }, [callLogs]);

  const activeLeads = leads.filter((l) => l.status !== "Unsubscribed");
  const trashedLeads = leads.filter((l) => l.status === "Unsubscribed");
  const filteredLeads = activeLeads.filter((l) => !search || l.phone_number.includes(search) || l.customer_name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(filteredLeads.map((l) => l.id)) : new Set());
  const allSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id));

  const bulkDelete = async () => {
    const ids = [...selectedIds]; if (!ids.length) return;
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `${ids.length} leads deleted` }); setSelectedIds(new Set()); load();
  };
  const bulkMove = async (status: string) => {
    const ids = [...selectedIds]; if (!ids.length) return;
    const { error } = await supabase.from("leads").update({ status: status as any }).in("id", ids);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Moved to ${status}` }); setSelectedIds(new Set()); load();
  };
  const bulkAssign = async (telecallerId: string) => {
    const ids = [...selectedIds]; if (!ids.length) return;
    const { error } = await supabase.from("leads").update({ assigned_telecaller: telecallerId }).in("id", ids);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Assigned" }); setSelectedIds(new Set()); load();
  };

  const addArea = async () => { if (!newArea.trim() || !companyId) return; const { error } = await supabase.from("areas").insert({ name: newArea.trim(), company_id: companyId }); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); setNewArea(""); load(); };
  const deleteArea = async (id: string) => { await supabase.from("areas").delete().eq("id", id); load(); };
  const addAssignment = async () => { if (!assignT || !assignA) return; const { error } = await supabase.from("telecaller_areas").insert({ telecaller_id: assignT, area_id: assignA }); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Assigned" }); load(); };
  const removeAssignment = async (id: string) => { await supabase.from("telecaller_areas").delete().eq("id", id); load(); };
  const setManager = async (telecallerId: string, managerId: string | null) => { const { error } = await supabase.from("profiles").update({ manager_id: managerId }).eq("id", telecallerId); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Manager updated" }); load(); };
  const deleteLead = async (id: string) => { await supabase.from("leads").delete().eq("id", id); load(); };
  const restoreLead = async (id: string) => { const { error } = await supabase.from("leads").update({ status: "New" }).eq("id", id); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Restored" }); load(); };

  const removeFromTeam = async (userId: string, role: "manager" | "telecaller") => {
    if (role === "telecaller") await supabase.from("telecaller_areas").delete().eq("telecaller_id", userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Removed from team" }); load();
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return toast({ title: "Email zaroori hai", variant: "destructive" });
    const link = `${window.location.origin}/auth?invite=${encodeURIComponent(inviteEmail)}&role=${inviteRole}&name=${encodeURIComponent(inviteName)}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    toast({ title: "Invite link copied", description: `Bhej do ${inviteEmail} ko (${inviteRole})` });
    setInviteName(""); setInviteEmail("");
  };

  const areasFor = (tcId: string) => assignments.filter((x) => x.telecaller_id === tcId).map((x) => areas.find((a) => a.id === x.area_id)?.name).filter(Boolean).join(", ");
  const managerName = (id?: string | null) => managers.find((m) => m.id === id)?.full_name ?? "—";

  // Reset selection when filter changes
  useEffect(() => { setSelectedIds(new Set()); }, [section, search]);

  const Content = () => {
    switch (section) {
      case "overview": return <AdminOverviewPanel />;
      case "accounts": return <AccountsPanel />;
      case "motor": return <MotorPanel />;
      case "health": return <HealthPanel />;
      case "life": return <LifePanel />;
      case "dashboard": return <WavelengthDashboard />;
      case "calling": return <CallingList callerName="Owner" role="admin" />;
      case "renewals": return <RenewalsPanel />;
      case "customers": return <CustomersPanel />;
      case "performance": return <PerformancePanel />;
      case "enquiries": return <EnquiriesPanel />;
      case "import": return <SmartImportPanel areas={areas} telecallers={telecallers} onDone={load} />;
     case "messaging": return <WhatsAppBulkMessaging />;
     case "calculator": return <PremiumCalculator />;
      case "api": return <ApiKeysManager />;
      case "secrets": return <SecretsManager />;
      case "training": return <TrainingModule canManage={true} />;
      case "settings": return <GeneralSettings />;
      case "account": return <AccountSettings />;
      case "permissions": return <PermissionsMatrix />;
      case "approvals": return <PendingApprovalsPanel />;
      case "fields": return <CRMFieldsManager />;
      case "statuses": return <StatusConfigurator />;
      case "leads": return (
        <div className="space-y-6 pb-20">
          <AddCustomerForm areas={areas} telecallers={telecallers} onDone={load} />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Customers ({filteredLeads.length})</CardTitle>
                <Input className="max-w-xs" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} /></TableHead>
                  <TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead>
                  <TableHead>Policy</TableHead><TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead><TableHead>Last Disposition</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>{filteredLeads.map((l) => {
                  const dispo = lastDispoMap.get(l.id);
                  const dispoBy = dispo ? profileById.get(dispo.telecaller_id)?.full_name : null;
                  return (
                    <TableRow key={l.id} data-state={selectedIds.has(l.id) ? "selected" : undefined}>
                      <TableCell><Checkbox checked={selectedIds.has(l.id)} onCheckedChange={() => toggle(l.id)} /></TableCell>
                      <TableCell className="font-medium">{l.customer_name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.phone_number}</TableCell>
                      <TableCell>{l.areas?.name}</TableCell>
                      <TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                      <TableCell className="text-xs">{l.assigned_telecaller ? (profileById.get(l.assigned_telecaller)?.full_name ?? "—") : <span className="text-muted-foreground">unassigned</span>}</TableCell>
                      <TableCell className="text-xs">
                        {dispo ? (
                          <div>
                            <Badge variant="outline" className="mr-1">{dispo.status}</Badge>
                            <span className="text-muted-foreground">by {dispoBy ?? "—"} · {new Date(dispo.called_at).toLocaleDateString()}</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  );
                })}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
      case "areas": return (
        <Card>
          <CardHeader><CardTitle>Manage areas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2"><Input placeholder="New area name" value={newArea} onChange={(e) => setNewArea(e.target.value)} /><Button variant="hero" onClick={addArea}><Plus className="h-4 w-4" /> Add</Button></div>
            <div className="flex flex-wrap gap-2">{areas.map((a) => (
              <Badge key={a.id} variant="secondary" className="gap-2 px-3 py-1.5 text-sm"><MapPin className="h-3 w-3" /> {a.name}<button onClick={() => deleteArea(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></button></Badge>
            ))}</div>
          </CardContent>
        </Card>
      );
      case "team": return (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Invite User</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5"><Label>Full Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="telecaller">Telecaller</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-end"><Button variant="hero" className="w-full" onClick={sendInvite}><Copy className="h-4 w-4" /> Copy Invite Link</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assign telecaller → area</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Select value={assignT} onValueChange={setAssignT}><SelectTrigger><SelectValue placeholder="Telecaller" /></SelectTrigger><SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select>
              <Select value={assignA} onValueChange={setAssignA}><SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger><SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
              <Button variant="hero" onClick={addAssignment}><Plus className="h-4 w-4" /> Assign</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Managers ({managers.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {managers.length === 0 ? <p className="text-sm text-muted-foreground">No managers.</p> : managers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="font-medium">{m.full_name || "(no name)"}</div>
                  <RemoveTeamButton name={m.full_name} onConfirm={() => removeFromTeam(m.id, "manager")} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Telecallers ({telecallers.length})</CardTitle></CardHeader>
            <CardContent>
              {telecallers.length === 0 ? <p className="text-sm text-muted-foreground">No telecallers yet.</p> : (
                <div className="space-y-3">{telecallers.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{t.full_name || "(no name)"}</div>
                        <div className="text-sm text-muted-foreground">Areas: {areasFor(t.id) || "—"}</div>
                        <div className="text-sm text-muted-foreground">Manager: {managerName(t.manager_id)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={t.manager_id ?? "none"} onValueChange={(v) => setManager(t.id, v === "none" ? null : v)}>
                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Set manager" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">No manager</SelectItem>{managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                        <RemoveTeamButton name={t.full_name} onConfirm={() => removeFromTeam(t.id, "telecaller")} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">{assignments.filter((x) => x.telecaller_id === t.id).map((x) => {
                      const area = areas.find((a) => a.id === x.area_id);
                      return <Badge key={x.id} variant="outline" className="gap-1">{area?.name}<button onClick={() => removeAssignment(x.id)}><Trash2 className="h-3 w-3 text-destructive" /></button></Badge>;
                    })}</div>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </div>
      );
      case "trash": return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> Do Not Call (Trash)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {trashedLeads.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No unsubscribed leads.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead><TableHead>Policy</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{trashedLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.customer_name}</TableCell><TableCell>{l.phone_number}</TableCell>
                    <TableCell>{l.areas?.name}</TableCell><TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => restoreLead(l.id)}><RotateCcw className="h-4 w-4" /> Restore</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-3 shadow-soft md:px-6">
        <div className="flex items-center gap-2">
          <HamburgerMenu items={NAV} active={section} onChange={setSection} />
          <Logo />
          <Badge variant="secondary" className="hidden md:inline-flex">Owner</Badge>
        </div>
        <div className="flex items-center gap-2">
          <SuperAdminLink />
          <InstallPWA />
        </div>
      </header>
      <main className="p-4 md:p-6"><Content /></main>
      {section === "leads" && (
        <BulkActionBar
          count={selectedIds.size}
          telecallers={telecallers as any}
          onClear={() => setSelectedIds(new Set())}
          onDelete={bulkDelete}
          onMove={bulkMove}
          onAssign={bulkAssign}
        />
      )}
    </div>
  );
};

const RemoveTeamButton = ({ name, onConfirm }: { name: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove {name || "user"} from team?</AlertDialogTitle>
        <AlertDialogDescription>Inka role aur area assignments hatt jayenge. Login account khud delete nahi hoga.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const SuperAdminLink = () => {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return null;
  return (
    <Button asChild variant="outline" size="sm" className="gap-1">
      <a href="/super-admin"><Shield className="h-4 w-4" /> Super Admin</a>
    </Button>
  );
};

export default AdminDashboard;
