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

export const AgentsList = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const empty = { full_name: "", agent_code: "", agent_type: "direct", phone: "", email: "", pan: "", aadhaar: "", posp_license_no: "", posp_license_expiry: "", bank_name: "", bank_account: "", ifsc: "", split_percent: 70, is_active: true };
  const [form, setForm] = useState<any>(empty);

  const load = async () => { const { data } = await supabase.from("agents_profile").select("*").order("full_name"); setRows(data ?? []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.full_name?.trim() || !companyId) return;
    const payload = { ...form, posp_license_expiry: form.posp_license_expiry || null };
    if (edit) {
      const { error } = await supabase.from("agents_profile").update(payload).eq("id", edit.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("agents_profile").insert({ ...payload, company_id: companyId });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setOpen(false); setEdit(null); setForm(empty); load();
  };
  const del = async (id: string) => { if (!confirm("Delete agent?")) return; await supabase.from("agents_profile").delete().eq("id", id); load(); };
  const openEdit = (r: any) => { setEdit(r); setForm({ ...r, posp_license_expiry: r.posp_license_expiry || "" }); setOpen(true); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agents ({rows.length})</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEdit(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> Add Agent</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Agent</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Code</Label><Input value={form.agent_code} onChange={(e) => setForm({ ...form, agent_code: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={form.agent_type} onValueChange={(v) => setForm({ ...form, agent_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="posp">POSP</SelectItem>
                      <SelectItem value="proxy">Proxy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Split %</Label><Input type="number" step="0.01" value={form.split_percent} onChange={(e) => setForm({ ...form, split_percent: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>PAN</Label><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Aadhaar</Label><Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>POSP License No.</Label><Input value={form.posp_license_no} onChange={(e) => setForm({ ...form, posp_license_no: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>POSP Expiry</Label><Input type="date" value={form.posp_license_expiry} onChange={(e) => setForm({ ...form, posp_license_expiry: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>A/C No.</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>IFSC</Label><Input value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></div>
              </div>
              <Button variant="hero" onClick={save}>{edit ? "Update" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead>
            <TableHead>Split%</TableHead><TableHead>Phone</TableHead><TableHead>PAN</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell>{r.agent_code || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="uppercase">{r.agent_type}</Badge></TableCell>
                <TableCell>{r.split_percent}%</TableCell>
                <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                <TableCell className="font-mono text-xs">{r.pan}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No agents yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
