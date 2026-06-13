import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Trash2, MapPin } from "lucide-react";

type Branch = {
  id: string; name: string; code: string | null; address: string | null;
  city: string | null; state: string | null; pincode: string | null;
  phone: string | null; email: string | null; manager_id: string | null;
  is_active: boolean;
};
type Profile = { id: string; full_name: string; branch_id: string | null };

const empty = { name: "", code: "", address: "", city: "", state: "", pincode: "", phone: "", email: "", manager_id: "", is_active: true };

export const BranchesPanel = () => {
  const { companyId, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [tab, setTab] = useState("list");

  const load = async () => {
    const [b, p] = await Promise.all([
      (supabase as any).from("branches").select("*").order("name"),
      (supabase as any).from("profiles").select("id,full_name,branch_id"),
    ]);
    setBranches((b.data ?? []) as Branch[]);
    setProfiles((p.data ?? []) as Profile[]);
  };
  useEffect(() => { load(); }, []);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const startNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name, code: b.code ?? "", address: b.address ?? "",
      city: b.city ?? "", state: b.state ?? "", pincode: b.pincode ?? "",
      phone: b.phone ?? "", email: b.email ?? "", manager_id: b.manager_id ?? "",
      is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !companyId) return toast({ title: "Name required", variant: "destructive" });
    const payload: any = {
      name: form.name.trim(), code: form.code || null, address: form.address || null,
      city: form.city || null, state: form.state || null, pincode: form.pincode || null,
      phone: form.phone || null, email: form.email || null,
      manager_id: form.manager_id || null, is_active: form.is_active,
    };
    if (editing) {
      const { error } = await (supabase as any).from("branches").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Branch updated" });
    } else {
      payload.company_id = companyId;
      payload.created_by = user?.id ?? null;
      const { error } = await (supabase as any).from("branches").insert(payload);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Branch created" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this branch? Users assigned will be unassigned.")) return;
    const { error } = await (supabase as any).from("branches").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const assignUser = async (userId: string, branchId: string) => {
    const { error } = await (supabase as any).from("profiles").update({ branch_id: branchId === "none" ? null : branchId }).eq("id", userId);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Updated" }); load();
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Branches</h2>
          <p className="text-sm text-muted-foreground">Create branches and assign team members.</p>
        </div>
        <Button onClick={startNew}><Plus className="mr-1 h-4 w-4" /> Add Branch</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list"><Building2 className="mr-1 h-4 w-4" /> Branches ({branches.length})</TabsTrigger>
          <TabsTrigger value="assign"><Users className="mr-1 h-4 w-4" /> Assign Users</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>City</TableHead>
                  <TableHead>Manager</TableHead><TableHead>Members</TableHead>
                  <TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {branches.map((b) => {
                    const count = profiles.filter((p) => p.branch_id === b.id).length;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="font-mono text-xs">{b.code ?? "—"}</TableCell>
                        <TableCell>{b.city ?? "—"}</TableCell>
                        <TableCell className="text-xs">{b.manager_id ? byId.get(b.manager_id)?.full_name ?? "—" : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{count}</Badge></TableCell>
                        <TableCell><Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="space-x-1 text-right">
                          <Button size="sm" variant="outline" onClick={() => startEdit(b)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!branches.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No branches yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Assign team members to branches</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded border p-2">
                  <div className="font-medium">{p.full_name || "—"}</div>
                  <Select value={p.branch_id ?? "none"} onValueChange={(v) => assignUser(p.id, v)}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit branch" : "Add branch"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div>
              <Label>Branch Manager</Label>
              <Select value={form.manager_id || "none"} onValueChange={(v) => setForm({ ...form, manager_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "—"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.is_active ? "active" : "inactive"} onValueChange={(v) => setForm({ ...form, is_active: v === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
