import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { LogOut, Plus, Trash2, Upload, MapPin, Users, FileSpreadsheet } from "lucide-react";

type Area = { id: string; name: string };
type Profile = { id: string; full_name: string };
type Assignment = { id: string; telecaller_id: string; area_id: string };
type Lead = {
  id: string; customer_name: string; phone_number: string; area_id: string;
  policy_type: "Life" | "Health" | "Motor"; status: string; areas?: { name: string } | null;
};

const POLICIES = ["Life", "Health", "Motor"] as const;

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [telecallers, setTelecallers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [newArea, setNewArea] = useState("");
  const [assignT, setAssignT] = useState("");
  const [assignA, setAssignA] = useState("");

  const [lead, setLead] = useState({ customer_name: "", phone_number: "", area_id: "", policy_type: "Life" as "Life" | "Health" | "Motor" });

  const load = async () => {
    const [a, p, ta, l, roles] = await Promise.all([
      supabase.from("areas").select("*").order("name"),
      supabase.from("profiles").select("id,full_name"),
      supabase.from("telecaller_areas").select("*"),
      supabase.from("leads").select("id,customer_name,phone_number,area_id,policy_type,status, areas(name)").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setAreas(a.data ?? []);
    const tcIds = new Set((roles.data ?? []).filter((r) => r.role === "telecaller").map((r) => r.user_id));
    setTelecallers((p.data ?? []).filter((x) => tcIds.has(x.id)));
    setAssignments(ta.data ?? []);
    setLeads((l.data ?? []) as any);
  };

  useEffect(() => { load(); }, []);

  const addArea = async () => {
    if (!newArea.trim()) return;
    const { error } = await supabase.from("areas").insert({ name: newArea.trim() });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewArea(""); load();
  };

  const deleteArea = async (id: string) => {
    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const addAssignment = async () => {
    if (!assignT || !assignA) return;
    const { error } = await supabase.from("telecaller_areas").insert({ telecaller_id: assignT, area_id: assignA });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Assigned" });
    load();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from("telecaller_areas").delete().eq("id", id);
    load();
  };

  const addLead = async () => {
    if (!lead.customer_name || !lead.phone_number || !lead.area_id) {
      return toast({ title: "Fill all fields", variant: "destructive" });
    }
    const { error } = await supabase.from("leads").insert(lead);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setLead({ customer_name: "", phone_number: "", area_id: "", policy_type: "Life" });
    toast({ title: "Lead added" }); load();
  };

  const deleteLead = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id); load();
  };

  const handleCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines[0].toLowerCase().split(",").map((s) => s.trim());
    const idx = (k: string) => header.indexOf(k);
    const ic = idx("customer_name"), ip = idx("phone_number"), ia = idx("area"), ipt = idx("policy_type");
    if (ic < 0 || ip < 0 || ia < 0 || ipt < 0) {
      return toast({ title: "Bad CSV", description: "Headers required: customer_name,phone_number,area,policy_type", variant: "destructive" });
    }
    const areaMap = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));
    const rows: any[] = [];
    let skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(",").map((s) => s.trim());
      const areaId = areaMap.get(c[ia]?.toLowerCase());
      if (!areaId || !POLICIES.includes(c[ipt] as any)) { skipped++; continue; }
      rows.push({ customer_name: c[ic], phone_number: c[ip], area_id: areaId, policy_type: c[ipt] });
    }
    if (rows.length === 0) return toast({ title: "No valid rows", variant: "destructive" });
    const { error } = await supabase.from("leads").insert(rows);
    if (error) return toast({ title: "Import failed", description: error.message, variant: "destructive" });
    toast({ title: `Imported ${rows.length} leads`, description: skipped ? `${skipped} rows skipped` : undefined });
    load();
  };

  const areasFor = (tcId: string) =>
    assignments.filter((x) => x.telecaller_id === tcId).map((x) => areas.find((a) => a.id === x.area_id)?.name).filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="secondary">Admin</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="leads">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="leads"><FileSpreadsheet className="mr-2 h-4 w-4" />Leads</TabsTrigger>
            <TabsTrigger value="areas"><MapPin className="mr-2 h-4 w-4" />Areas</TabsTrigger>
            <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
            <TabsTrigger value="import"><Upload className="mr-2 h-4 w-4" />Import</TabsTrigger>
          </TabsList>

          {/* LEADS */}
          <TabsContent value="leads" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Add new lead</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                <Input placeholder="Customer name" value={lead.customer_name} onChange={(e) => setLead({ ...lead, customer_name: e.target.value })} />
                <Input placeholder="Phone number" value={lead.phone_number} onChange={(e) => setLead({ ...lead, phone_number: e.target.value })} />
                <Select value={lead.area_id} onValueChange={(v) => setLead({ ...lead, area_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={lead.policy_type} onValueChange={(v) => setLead({ ...lead, policy_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POLICIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="hero" onClick={addLead}><Plus className="h-4 w-4" /> Add lead</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>All leads ({leads.length})</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead>
                    <TableHead>Policy</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.customer_name}</TableCell>
                        <TableCell>{l.phone_number}</TableCell>
                        <TableCell>{l.areas?.name}</TableCell>
                        <TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AREAS */}
          <TabsContent value="areas" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Manage areas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="New area name (e.g. Dewas)" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
                  <Button variant="hero" onClick={addArea}><Plus className="h-4 w-4" /> Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
                      <MapPin className="h-3 w-3" /> {a.name}
                      <button onClick={() => deleteArea(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Assign telecaller → area</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Select value={assignT} onValueChange={setAssignT}>
                  <SelectTrigger><SelectValue placeholder="Select telecaller" /></SelectTrigger>
                  <SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={assignA} onValueChange={setAssignA}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="hero" onClick={addAssignment}><Plus className="h-4 w-4" /> Assign</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Telecallers</CardTitle></CardHeader>
              <CardContent>
                {telecallers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No telecallers yet. Sign up new staff at /auth then promote them in Cloud → user_roles.</p>
                ) : (
                  <div className="space-y-3">
                    {telecallers.map((t) => (
                      <div key={t.id} className="rounded-lg border p-3">
                        <div className="font-medium">{t.full_name || "(no name)"}</div>
                        <div className="text-sm text-muted-foreground">Areas: {areasFor(t.id) || "—"}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignments.filter((x) => x.telecaller_id === t.id).map((x) => {
                            const area = areas.find((a) => a.id === x.area_id);
                            return (
                              <Badge key={x.id} variant="outline" className="gap-1">
                                {area?.name}
                                <button onClick={() => removeAssignment(x.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IMPORT */}
          <TabsContent value="import">
            <Card>
              <CardHeader><CardTitle>Import leads from CSV</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <div className="font-medium">Required headers (first row):</div>
                  <code className="text-xs">customer_name,phone_number,area,policy_type</code>
                  <div className="mt-2 text-muted-foreground">Area must exactly match an existing area name. Policy must be Life, Health, or Motor.</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="csv">Upload CSV</Label>
                  <Input id="csv" type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleCSV(e.target.files[0])} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
