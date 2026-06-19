import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Vendor = any;

const TYPES = [
  { value: "broker", label: "Broker" },
  { value: "pos", label: "POS Partner" },
  { value: "aggregator", label: "Aggregator" },
  { value: "finance_bank", label: "Bank" },
  { value: "finance_nbfc", label: "NBFC" },
  { value: "rto", label: "RTO Partner" },
];

const emptyForm = { name: "", vendor_type: "broker", category: "", contact_person: "", contact_phone: "", contact_email: "", notes: "", is_active: true };

export const VendorsMaster = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Vendor | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase.from("vendors").select("*").order("vendor_type").order("name");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name?.trim() || !companyId) return;
    if (edit) {
      const { error } = await supabase.from("vendors").update(form).eq("id", edit.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("vendors").insert({ ...form, company_id: companyId });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setOpen(false); setEdit(null); setForm(emptyForm); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    await supabase.from("vendors").delete().eq("id", id); load();
  };

  const openEdit = (r: Vendor) => { setEdit(r); setForm({ ...emptyForm, ...r }); setOpen(true); };
  const openAdd = () => { setEdit(null); setForm(emptyForm); setOpen(true); };

  const filtered = rows.filter((r) =>
    (typeFilter === "all" || r.vendor_type === typeFilter) &&
    (!q.trim() || r.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Vendors ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 w-48 pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
              <DialogTrigger asChild><Button variant="hero" size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Vendor</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Vendor</DialogTitle></DialogHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Type *</Label>
                    <Select value={form.vendor_type} onValueChange={(v) => setForm({ ...form, vendor_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Category</Label><Input placeholder="e.g. motor, life" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                  <div className="space-y-1.5 md:col-span-2"><Label>Email</Label><Input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                  <div className="space-y-1.5 md:col-span-2"><Label>Notes</Label><Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <div className="flex items-center gap-2 md:col-span-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                </div>
                <Button variant="hero" onClick={save}>{edit ? "Update" : "Create"}</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{(TYPES.find((t) => t.value === r.vendor_type)?.label) || r.vendor_type}</Badge></TableCell>
                <TableCell className="text-xs">{r.contact_person} {r.contact_phone && `· ${r.contact_phone}`}</TableCell>
                <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No vendors match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
