import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Search, Users, Building2 } from "lucide-react";

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

export default function OrgHierarchyPanel() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newDesigLabel, setNewDesigLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", me.user.id).maybeSingle();
    const cid = (prof as any)?.company_id;
    setCompanyId(cid);
    if (!cid) { setLoading(false); return; }
    const [{ data: ps }, { data: ds }, { data: bs }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,designation,manager_id,branch_id,is_active").eq("company_id", cid),
      (supabase as any).from("employee_designations").select("*").eq("company_id", cid).order("sort_order"),
      supabase.from("branches").select("id,name").eq("company_id", cid),
    ]);
    setProfiles((ps as any) || []);
    setDesignations((ds as any) || []);
    setBranches((bs as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => (p.full_name || "").toLowerCase().includes(q) || (p.designation || "").toLowerCase().includes(q));
  }, [profiles, search]);

  const branchManagers = filtered.filter(p => p.designation === "branch_manager");
  const managers = filtered.filter(p => p.designation === "manager");
  const unassigned = filtered.filter(p => !p.designation);
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

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name || "—";
  const userName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Designations master */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Employee Designations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {designations.map(d => (
              <Badge key={d.id} variant={d.is_active ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleDesignation(d)}>
                {d.label}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="New designation (e.g. Surveyor)" value={newDesigLabel} onChange={e => setNewDesigLabel(e.target.value)} className="max-w-sm" />
            <Button onClick={addDesignation}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or designation..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </div>

      {/* Hierarchy tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Org Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {branchManagers.length === 0 && (
            <p className="text-sm text-muted-foreground">No Branch/Master Managers assigned yet. Set someone's designation to "Branch / Master Manager" below.</p>
          )}
          {branchManagers.map(bm => {
            const directManagers = managers.filter(m => m.manager_id === bm.id);
            const open = expanded[bm.id] ?? true;
            return (
              <div key={bm.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setExpanded(s => ({ ...s, [bm.id]: !open }))}>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <span className="font-semibold">{bm.full_name}</span>
                  <Badge variant="secondary">Branch Manager</Badge>
                  <Badge variant="outline">{branchName(bm.branch_id)}</Badge>
                </div>
                {open && (
                  <div className="ml-8 mt-2 space-y-2">
                    {directManagers.length === 0 && <p className="text-xs text-muted-foreground">No managers under this BM.</p>}
                    {directManagers.map(mgr => {
                      const emps = employeesByManager[mgr.id] || [];
                      const mopen = expanded[mgr.id] ?? false;
                      return (
                        <div key={mgr.id} className="border-l-2 border-border pl-3">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setExpanded(s => ({ ...s, [mgr.id]: !mopen }))}>
                              {mopen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <span className="font-medium">{mgr.full_name}</span>
                            <Badge variant="outline">Manager</Badge>
                            <Badge variant="outline" className="text-xs">{emps.length} employees</Badge>
                          </div>
                          {mopen && (
                            <div className="ml-8 mt-1 grid gap-1">
                              {emps.map(e => (
                                <div key={e.id} className="flex items-center gap-2 text-sm">
                                  <span>{e.full_name}</span>
                                  <Badge variant="outline" className="text-xs">{designations.find(d => d.key === e.designation)?.label || e.designation}</Badge>
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

      {/* Assignment table */}
      <Card>
        <CardHeader><CardTitle>All Members — Assign Designation, Manager & Branch</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell>
                    <Select value={p.designation || ""} onValueChange={v => updateProfile(p.id, { designation: v || null })}>
                      <SelectTrigger className="w-44 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {designations.filter(d => d.is_active).map(d => (
                          <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={p.manager_id || "none"} onValueChange={v => updateProfile(p.id, { manager_id: v === "none" ? null : v })}>
                      <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {[...branchManagers, ...managers].filter(m => m.id !== p.id).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.designation === "branch_manager" ? "BM" : "Mgr"})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={p.branch_id || "none"} onValueChange={v => updateProfile(p.id, { branch_id: v === "none" ? null : v } as any)}>
                      <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
