import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Users, Phone, Mail, Trash2, Upload, FileText, UserPlus, Network } from "lucide-react";

type Customer = {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  dob: string | null;
  gender: string | null;
  occupation: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  pan: string | null;
  aadhaar_last4: string | null;
  kyc_status: string;
  family_head_id: string | null;
  relation_to_head: string | null;
  agent_id: string | null;
  tags: string[] | null;
  created_at: string;
};

type Doc = { id: string; doc_type: string; label: string | null; storage_path: string; created_at: string };

const empty = {
  full_name: "", mobile: "", email: "", dob: "", gender: "", occupation: "",
  address_line1: "", city: "", state: "", pincode: "",
  pan: "", aadhaar_last4: "", kyc_status: "pending",
  family_head_id: "", relation_to_head: "self", notes: "",
};

export const Customer360Panel = () => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [tab, setTab] = useState("list");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Customer[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      c.full_name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.pan ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Family grouping: rows whose family_head_id is null are heads (or themselves heads)
  const families = useMemo(() => {
    const map = new Map<string, Customer[]>();
    rows.forEach((c) => {
      const headId = c.family_head_id || c.id;
      if (!map.has(headId)) map.set(headId, []);
      map.get(headId)!.push(c);
    });
    return Array.from(map.entries()).map(([headId, members]) => ({
      head: rows.find((r) => r.id === headId) || members[0],
      members,
    })).filter((f) => f.members.length > 1);
  }, [rows]);

  const startNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      full_name: c.full_name, mobile: c.mobile, email: c.email ?? "",
      dob: c.dob ?? "", gender: c.gender ?? "", occupation: c.occupation ?? "",
      address_line1: "", city: c.city ?? "", state: c.state ?? "", pincode: c.pincode ?? "",
      pan: c.pan ?? "", aadhaar_last4: c.aadhaar_last4 ?? "", kyc_status: c.kyc_status,
      family_head_id: c.family_head_id ?? "", relation_to_head: c.relation_to_head ?? "self", notes: "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.mobile.trim()) {
      return toast({ title: "Name and mobile required", variant: "destructive" });
    }
    if (!companyId) return;
    const payload: any = {
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      email: form.email || null,
      dob: form.dob || null,
      gender: form.gender || null,
      occupation: form.occupation || null,
      address_line1: form.address_line1 || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
      pan: form.pan ? form.pan.toUpperCase() : null,
      aadhaar_last4: form.aadhaar_last4 ? form.aadhaar_last4.slice(-4) : null,
      kyc_status: form.kyc_status,
      family_head_id: form.family_head_id || null,
      relation_to_head: form.relation_to_head || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from("customers").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Customer updated" });
    } else {
      payload.company_id = companyId;
      payload.agent_id = user?.id ?? null;
      payload.created_by = user?.id ?? null;
      const { error } = await (supabase as any).from("customers").insert(payload);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Customer added" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await (supabase as any).from("customers").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  const openDocs = async (c: Customer) => {
    setSelected(c);
    const { data } = await (supabase as any)
      .from("customer_documents").select("*").eq("customer_id", c.id).order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  };

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !companyId) return;
    const path = `${companyId}/${selected.id}/${Date.now()}_${file.name}`;
    const up = await supabase.storage.from("customer-docs").upload(path, file);
    if (up.error) return toast({ title: "Upload failed", description: up.error.message, variant: "destructive" });
    const { error } = await (supabase as any).from("customer_documents").insert({
      company_id: companyId, customer_id: selected.id,
      doc_type: docType, label: file.name, storage_path: path,
      mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id ?? null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Uploaded" }); openDocs(selected);
    e.target.value = "";
  };

  const viewDoc = async (path: string) => {
    const { data } = await supabase.storage.from("customer-docs").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const delDoc = async (d: Doc) => {
    await supabase.storage.from("customer-docs").remove([d.storage_path]);
    await (supabase as any).from("customer_documents").delete().eq("id", d.id);
    if (selected) openDocs(selected);
  };

  const heads = rows.filter((r) => !r.family_head_id);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Customer 360</h2>
          <p className="text-sm text-muted-foreground">Master records, KYC, family mapping and documents.</p>
        </div>
        <Button onClick={startNew}><Plus className="mr-1 h-4 w-4" /> Add Customer</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list"><Users className="mr-1 h-4 w-4" /> All ({rows.length})</TabsTrigger>
          <TabsTrigger value="families"><Network className="mr-1 h-4 w-4" /> Families ({families.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, mobile, email, PAN…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Mobile</TableHead><TableHead>Email</TableHead>
                  <TableHead>City</TableHead><TableHead>KYC</TableHead><TableHead>Family</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.mobile}</TableCell>
                      <TableCell className="text-xs">{c.email ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.city ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.kyc_status === "verified" ? "default" : c.kyc_status === "rejected" ? "destructive" : "secondary"}>
                          {c.kyc_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.family_head_id ? <Badge variant="outline">{c.relation_to_head ?? "member"}</Badge> : <Badge variant="outline">head</Badge>}
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button size="sm" variant="outline" onClick={() => openDocs(c)}><FileText className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(c)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No customers yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="families" className="mt-4 space-y-3">
          {families.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No family groups yet. Link customers to a "family head" while editing.</p>}
          {families.map((f) => (
            <Card key={f.head.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="h-4 w-4 text-primary" />
                  {f.head.full_name}
                  <Badge variant="outline">{f.members.length} members</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {f.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div>
                      <span className="font-medium">{m.full_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.id === f.head.id ? "head" : (m.relation_to_head ?? "member")}</span>
                    </div>
                    <span className="font-mono text-xs">{m.mobile}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Mobile *</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>DOB</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
            <div><Label>PAN</Label><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} /></div>
            <div><Label>Aadhaar (last 4)</Label><Input value={form.aadhaar_last4} maxLength={4} onChange={(e) => setForm({ ...form, aadhaar_last4: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div>
              <Label>KYC Status</Label>
              <Select value={form.kyc_status} onValueChange={(v) => setForm({ ...form, kyc_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Family Head</Label>
              <Select value={form.family_head_id || "none"} onValueChange={(v) => setForm({ ...form, family_head_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None (this is head)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None (head) —</SelectItem>
                  {heads.filter((h) => h.id !== editing?.id).map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Relation to Head</Label>
              <Select value={form.relation_to_head || "self"} onValueChange={(v) => setForm({ ...form, relation_to_head: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["self","spouse","son","daughter","father","mother","brother","sister","other"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Documents — {selected?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {["aadhaar","pan","photo","other"].map((t) => (
                <label key={t} className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed p-3 text-xs hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  <span className="uppercase">{t}</span>
                  <input type="file" className="hidden" onChange={(e) => uploadDoc(e, t)} />
                </label>
              ))}
            </div>
            <div className="space-y-1">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{d.doc_type}</span>
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewDoc(d.storage_path)}>View</Button>
                    <Button size="sm" variant="ghost" onClick={() => delDoc(d)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {!docs.length && <p className="py-4 text-center text-xs text-muted-foreground">No documents uploaded.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
