import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Search, Users, Building2, Trash2, Edit3, Copy, UserPlus, Network, Mail, UserCheck, KeyRound } from "lucide-react";
import { PendingApprovalsPanel } from "@/components/admin/PendingApprovalsPanel";
import { EditMemberDialog, sanitizeName } from "@/components/admin/EditMemberDialog";
import { AddMemberDialog } from "@/components/admin/org/AddMemberDialog";
import { TrainingHelp } from "@/components/TrainingHelp";

type Profile = {
  id: string;
  full_name: string | null;
  designation: string | null;
  manager_id: string | null;
  branch_id: string | null;
  is_active: boolean | null;
};
type Designation = { id: string; key: string; label: string; sort_order: number; is_active: boolean };
type Branch = { id: string; name: string };
type Role = { user_id: string; role: "admin" | "manager" | "telecaller" | "sub_agent" };

export default function OrgHierarchyPanel() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newDesigLabel, setNewDesigLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<{ profile: Profile; role: Role["role"] } | null>(null);
  const [addOpen, setAddOpen] = useState(false);


  // Invite
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "telecaller">("telecaller");

  const load = async () => {
    setLoading(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", me.user.id).maybeSingle();
    const cid = (prof as any)?.company_id;
    setCompanyId(cid);
    if (!cid) { setLoading(false); return; }
    const [{ data: ps }, { data: ds }, { data: bs }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,designation,manager_id,branch_id,is_active").eq("company_id", cid),
      (supabase as any).from("employee_designations").select("*").eq("company_id", cid).order("sort_order"),
      supabase.from("branches").select("id,name").eq("company_id", cid),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((ps as any) || []);
    setDesignations((ds as any) || []);
    setBranches((bs as any) || []);
    setRoles((rs as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => (p.full_name || "").toLowerCase().includes(q) || (p.designation || "").toLowerCase().includes(q));
  }, [profiles, search]);

  const roleByUser = useMemo(() => {
    const m = new Map<string, Role["role"]>();
    roles.forEach(r => { if (!m.has(r.user_id) || r.role === "admin") m.set(r.user_id, r.role); });
    return m;
  }, [roles]);

  const branchManagers = filtered.filter(p => p.designation === "branch_manager");
  const managers = filtered.filter(p => p.designation === "manager");
  const employeesByManager = useMemo(() => {
    const map: Record<string, Profile[]> = {};
    filtered.forEach(p => {
      if (p.manager_id && p.designation && !["branch_manager", "manager"].includes(p.designation)) {
        (map[p.manager_id] ||= []).push(p);
      }
    });
    return map;
  }, [filtered]);

  const updateProfile = async (id: string, patch: Partial<Profile>) => {
    const { error } = await supabase.from("profiles").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    load();
  };

  const addDesignation = async () => {
    if (!newDesigLabel.trim() || !companyId) return;
    const key = newDesigLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const { error } = await (supabase as any).from("employee_designations").insert({
      company_id: companyId, key, label: newDesigLabel.trim(), sort_order: (designations.at(-1)?.sort_order || 0) + 10
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewDesigLabel("");
    load();
  };

  const toggleDesignation = async (d: Designation) => {
    await (supabase as any).from("employee_designations").update({ is_active: !d.is_active }).eq("id", d.id);
    load();
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member from the team? Their role and area assignments will be cleared.")) return;
    await supabase.from("telecaller_areas").delete().eq("telecaller_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").update({ is_active: false } as any).eq("id", userId);
    toast({ title: "Member removed" });
    load();
  };

  const resetMemberPassword = async (userId: string, name: string) => {
    if (!confirm(`Reset password for ${name || "this member"} to default?\n(First 4 letters of name + last 4 digits of mobile)`)) return;
    const { data, error } = await supabase.functions.invoke("team-admin", { body: { action: "reset_to_default", user_id: userId } });
    if (error || (data as any)?.error) return toast({ title: "Reset failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    try { await navigator.clipboard.writeText((data as any).password); } catch {}
    toast({ title: "Password reset ✅", description: `New password: ${(data as any).password} (copied)` });
  };


  const sendInvite = async () => {
    if (!inviteEmail.trim()) return toast({ title: "Email required", variant: "destructive" });
    const link = `${window.location.origin}/auth?invite=${encodeURIComponent(inviteEmail)}&role=${inviteRole}&name=${encodeURIComponent(inviteName)}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    toast({ title: "Invite link copied", description: `Share with ${inviteEmail} (${inviteRole})` });
    setInviteName(""); setInviteEmail("");
  };

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name || "—";

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-3">
      <Tabs defaultValue="team" className="space-y-3">
        <TabsList className="flex w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="team" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Team</TabsTrigger>
          <TabsTrigger value="hierarchy" className="text-xs"><Network className="h-3.5 w-3.5 mr-1" />Hierarchy</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs"><UserCheck className="h-3.5 w-3.5 mr-1" />Pending Approvals</TabsTrigger>
          <TabsTrigger value="invite" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1" />Invite</TabsTrigger>
        </TabsList>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Employee Designations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {designations.map(d => (
                  <Badge key={d.id} variant={d.is_active ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleDesignation(d)}>
                    {d.label}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="New designation" value={newDesigLabel} onChange={e => setNewDesigLabel(e.target.value)} className="h-9 text-sm sm:max-w-xs" />
                <Button size="sm" onClick={addDesignation}>Add</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">All Members ({filtered.length})</CardTitle>
                <div className="flex items-center gap-1.5 flex-1 sm:max-w-xs">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Designation</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Reports To</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Branch</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const role = roleByUser.get(p.id) || "telecaller";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.full_name || "—"}</TableCell>
                        <TableCell>
                          <Select value={p.designation || ""} onValueChange={v => updateProfile(p.id, { designation: v || null })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {designations.filter(d => d.is_active).map(d => (
                                <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Select value={p.manager_id || "none"} onValueChange={v => updateProfile(p.id, { manager_id: v === "none" ? null : v })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {[...branchManagers, ...managers].filter(m => m.id !== p.id).map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{branchName(p.branch_id)}</TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px]">{p.is_active ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditMember({ profile: p, role })} title="Edit">
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMember(p.id)} title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HIERARCHY */}
        <TabsContent value="hierarchy" className="space-y-3">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Org Hierarchy</CardTitle>
              <TrainingHelp moduleKey="hr" label="HR / Team" />
            </CardHeader>
            <CardContent className="space-y-2">
              {branchManagers.length === 0 && (
                <p className="text-xs text-muted-foreground">No Branch Managers assigned yet. Set someone's designation to "Branch Manager" in the Team tab.</p>
              )}
              {branchManagers.map(bm => {
                const directManagers = managers.filter(m => m.manager_id === bm.id);
                const open = expanded[bm.id] ?? true;
                return (
                  <div key={bm.id} className="border border-border rounded-lg p-2 bg-card">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(s => ({ ...s, [bm.id]: !open }))}>
                        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </Button>
                      <span className="font-semibold text-sm">{bm.full_name}</span>
                      <Badge variant="secondary" className="text-[10px]">BM</Badge>
                      <Badge variant="outline" className="text-[10px]">{branchName(bm.branch_id)}</Badge>
                    </div>
                    {open && (
                      <div className="ml-6 mt-1.5 space-y-1.5">
                        {directManagers.length === 0 && <p className="text-xs text-muted-foreground">No managers.</p>}
                        {directManagers.map(mgr => {
                          const emps = employeesByManager[mgr.id] || [];
                          const mopen = expanded[mgr.id] ?? false;
                          return (
                            <div key={mgr.id} className="border-l-2 border-border pl-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(s => ({ ...s, [mgr.id]: !mopen }))}>
                                  {mopen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </Button>
                                <span className="text-sm font-medium">{mgr.full_name}</span>
                                <Badge variant="outline" className="text-[10px]">Mgr</Badge>
                                <Badge variant="outline" className="text-[10px]">{emps.length}</Badge>
                              </div>
                              {mopen && (
                                <div className="ml-6 mt-1 grid gap-0.5">
                                  {emps.map(e => (
                                    <div key={e.id} className="flex items-center gap-1.5 text-xs">
                                      <span>{e.full_name}</span>
                                      <Badge variant="outline" className="text-[10px]">{designations.find(d => d.key === e.designation)?.label || e.designation}</Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PENDING APPROVALS */}
        <TabsContent value="approvals">
          <PendingApprovalsPanel />
        </TabsContent>

        {/* INVITE (last) */}
        <TabsContent value="invite">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Invite User</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input className="h-9 text-sm" value={inviteName} onChange={(e) => setInviteName(sanitizeName(e.target.value))} placeholder="Name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-9 text-sm" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="telecaller">Telecaller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button size="sm" variant="hero" className="w-full" onClick={sendInvite}><Copy className="h-4 w-4 mr-1" /> Copy Invite Link</Button>
              </div>
              <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-muted-foreground">
                Share the copied link with the new user. They will sign up and then appear in the Pending Approvals tab for you to approve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditMemberDialog
        open={!!editMember}
        onOpenChange={(o) => !o && setEditMember(null)}
        member={editMember?.profile as any}
        branches={branches}
        currentRole={(editMember?.role || "telecaller") as any}
        onSaved={() => { setEditMember(null); load(); }}
      />
    </div>
  );
}
