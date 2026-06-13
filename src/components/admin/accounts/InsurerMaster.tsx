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
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Insurer = any;

export const InsurerMaster = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<Insurer[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Insurer | null>(null);
  const [form, setForm] = useState<any>({ name: "", short_code: "", category: "motor", payout_cycle: "monthly", tds_rate: 5, gst_applicable: true, contact_person: "", contact_phone: "", contact_email: "" });

  const load = async () => {
    const { data } = await supabase.from("insurers").select("*").order("name");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name?.trim() || !companyId) return;
    if (edit) {
      const { error } = await supabase.from("insurers").update(form).eq("id", edit.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("insurers").insert({ ...form, company_id: companyId });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setOpen(false); setEdit(null);
    setForm({ name: "", short_code: "", category: "motor", payout_cycle: "monthly", tds_rate: 5, gst_applicable: true, contact_person: "", contact_phone: "", contact_email: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this insurer?")) return;
    await supabase.from("insurers").delete().eq("id", id); load();
  };

  const openEdit = (r: Insurer) => { setEdit(r); setForm(r); setOpen(true); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Insurers ({rows.length})</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
            <DialogTrigger asChild><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> Add Insurer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Insurer</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Short Code</Label><Input value={form.short_code || ""} onChange={(e) => setForm({ ...form, short_code: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motor">Motor</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="life">Life</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="multi">Multi-line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Payout Cycle</Label>
                  <Select value={form.payout_cycle} onValueChange={(v) => setForm({ ...form, payout_cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="adhoc">Ad-hoc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>TDS %</Label><Input type="number" step="0.01" value={form.tds_rate} onChange={(e) => setForm({ ...form, tds_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Email</Label><Input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              </div>
              <Button variant="hero" onClick={save}>{edit ? "Update" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Category</TableHead>
            <TableHead>Cycle</TableHead><TableHead>TDS%</TableHead><TableHead>Contact</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.short_code || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.category}</Badge></TableCell>
                <TableCell className="capitalize">{r.payout_cycle}</TableCell>
                <TableCell>{r.tds_rate}%</TableCell>
                <TableCell className="text-xs">{r.contact_person} {r.contact_phone && `· ${r.contact_phone}`}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No insurers yet. Add one to get started.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
