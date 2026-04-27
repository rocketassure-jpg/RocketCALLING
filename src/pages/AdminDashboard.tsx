import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { LogOut, Plus, Trash2, MapPin, Ban, RotateCcw, Menu } from "lucide-react";
import { CallingList } from "@/components/CallingList";
import { EnquiriesPanel } from "@/components/EnquiriesPanel";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { WavelengthDashboard } from "@/components/admin/WavelengthDashboard";
import { CSVImporter } from "@/components/admin/CSVImporter";
import { GeneralSettings } from "@/components/admin/GeneralSettings";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";
import { CRMFieldsManager } from "@/components/admin/CRMFieldsManager";
import { StatusConfigurator } from "@/components/admin/StatusConfigurator";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type Area = { id: string; name: string };
type Profile = { id: string; full_name: string; manager_id?: string | null };
type Role = { user_id: string; role: "admin" | "manager" | "telecaller" };
type Assignment = { id: string; telecaller_id: string; area_id: string };
type Lead = {
  id: string; customer_name: string; phone_number: string; area_id: string;
  policy_type: "Life" | "Health" | "Motor"; status: string;
  call_date: string; premium_amount: number;
  areas?: { name: string } | null;
};

const POLICIES = ["Life", "Health", "Motor"] as const;
const today = () => new Date().toISOString().slice(0, 10);

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [section, setSection] = useState("dashboard");
  const [areas, setAreas] = useState<Area[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newArea, setNewArea] = useState("");
  const [assignT, setAssignT] = useState("");
  const [assignA, setAssignA] = useState("");
  const [lead, setLead] = useState({ customer_name: "", phone_number: "", area_id: "", policy_type: "Life" as "Life" | "Health" | "Motor", call_date: today(), premium_amount: "0" });
  const [search, setSearch] = useState("");

  const load = async () => {
    const [a, p, r, ta, l] = await Promise.all([
      supabase.from("areas").select("*").order("name"),
      supabase.from("profiles").select("id,full_name,manager_id"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("telecaller_areas").select("*"),
      supabase.from("leads").select("id,customer_name,phone_number,area_id,policy_type,status,call_date,premium_amount, areas(name)").order("created_at", { ascending: false }),
    ]);
    setAreas(a.data ?? []); setProfiles(p.data ?? []); setRoles((r.data ?? []) as any); setAssignments(ta.data ?? []); setLeads((l.data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const telecallers = useMemo(() => { const ids = new Set(roles.filter((r) => r.role === "telecaller").map((r) => r.user_id)); return profiles.filter((x) => ids.has(x.id)); }, [profiles, roles]);
  const managers = useMemo(() => { const ids = new Set(roles.filter((r) => r.role === "manager").map((r) => r.user_id)); return profiles.filter((x) => ids.has(x.id)); }, [profiles, roles]);

  const activeLeads = leads.filter((l) => l.status !== "Unsubscribed");
  const trashedLeads = leads.filter((l) => l.status === "Unsubscribed");
  const filteredLeads = activeLeads.filter((l) => !search || l.phone_number.includes(search) || l.customer_name.toLowerCase().includes(search.toLowerCase()));

  const addArea = async () => { if (!newArea.trim()) return; const { error } = await supabase.from("areas").insert({ name: newArea.trim() }); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); setNewArea(""); load(); };
  const deleteArea = async (id: string) => { await supabase.from("areas").delete().eq("id", id); load(); };
  const addAssignment = async () => { if (!assignT || !assignA) return; const { error } = await supabase.from("telecaller_areas").insert({ telecaller_id: assignT, area_id: assignA }); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Assigned" }); load(); };
  const removeAssignment = async (id: string) => { await supabase.from("telecaller_areas").delete().eq("id", id); load(); };
  const setManager = async (telecallerId: string, managerId: string | null) => { const { error } = await supabase.from("profiles").update({ manager_id: managerId }).eq("id", telecallerId); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Manager updated" }); load(); };
  const addLead = async () => {
    if (!lead.customer_name || !lead.phone_number || !lead.area_id) return toast({ title: "Fill all fields", variant: "destructive" });
    const { error } = await supabase.from("leads").insert({ ...lead, premium_amount: Number(lead.premium_amount || 0) });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setLead({ customer_name: "", phone_number: "", area_id: "", policy_type: "Life", call_date: today(), premium_amount: "0" });
    toast({ title: "Lead added" }); load();
  };
  const deleteLead = async (id: string) => { await supabase.from("leads").delete().eq("id", id); load(); };
  const restoreLead = async (id: string) => { const { error } = await supabase.from("leads").update({ status: "New" }).eq("id", id); if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" }); toast({ title: "Restored" }); load(); };

  const areasFor = (tcId: string) => assignments.filter((x) => x.telecaller_id === tcId).map((x) => areas.find((a) => a.id === x.area_id)?.name).filter(Boolean).join(", ");
  const managerName = (id?: string | null) => managers.find((m) => m.id === id)?.full_name ?? "—";

  const Content = () => {
    switch (section) {
      case "dashboard": return <WavelengthDashboard />;
      case "calling": return <CallingList callerName="Owner" />;
      case "enquiries": return <EnquiriesPanel />;
      case "import": return <CSVImporter areas={areas} telecallers={telecallers} onDone={load} />;
      case "settings": return <GeneralSettings />;
      case "permissions": return <PermissionsMatrix />;
      case "fields": return <CRMFieldsManager />;
      case "statuses": return <StatusConfigurator />;
      case "leads": return (
        <div className="space-y-6">
          <AddCustomerForm areas={areas} onDone={load} />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Customers ({filteredLeads.length})</CardTitle>
                <Input className="max-w-xs" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead><TableHead>Policy</TableHead><TableHead>Status</TableHead><TableHead>Call date</TableHead><TableHead className="text-right">Premium</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{filteredLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.customer_name}</TableCell>
                    <TableCell className="font-mono text-xs">{l.phone_number}</TableCell>
                    <TableCell>{l.areas?.name}</TableCell>
                    <TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                    <TableCell>{l.call_date}</TableCell>
                    <TableCell className="text-right">₹{Number(l.premium_amount || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}</TableBody>
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
            <CardHeader><CardTitle>Assign telecaller → area</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Select value={assignT} onValueChange={setAssignT}><SelectTrigger><SelectValue placeholder="Telecaller" /></SelectTrigger><SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select>
              <Select value={assignA} onValueChange={setAssignA}><SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger><SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
              <Button variant="hero" onClick={addAssignment}><Plus className="h-4 w-4" /> Assign</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Telecallers</CardTitle></CardHeader>
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
                      <Select value={t.manager_id ?? "none"} onValueChange={(v) => setManager(t.id, v === "none" ? null : v)}>
                        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Set manager" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">No manager</SelectItem>{managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                      </Select>
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
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar active={section} onChange={setSection} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 shadow-soft md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="w-64 p-0"><AdminSidebar active={section} onChange={setSection} /></SheetContent>
            </Sheet>
            <div className="md:hidden"><Logo /></div>
            <Badge variant="secondary" className="hidden md:inline-flex">Owner</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6"><Content /></main>
      </div>
    </div>
  );
};

export default AdminDashboard;
