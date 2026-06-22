import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Building2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type C = { id: string; full_name: string; designation: string | null; mobile: string | null; email: string | null; is_primary: boolean };

export const CustomerContactsTab = ({ customerId }: { customerId: string }) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<C[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", designation: "", mobile: "", email: "", is_primary: false });

  const load = async () => {
    const { data } = await (supabase as any).from("customer_contacts").select("*").eq("customer_id", customerId).order("is_primary", { ascending: false });
    setRows((data ?? []) as C[]);
  };
  useEffect(() => { load(); }, [customerId]);

  const save = async () => {
    if (!form.full_name.trim() || !companyId) return toast({ title: "Name required", variant: "destructive" });
    if (form.is_primary) {
      await (supabase as any).from("customer_contacts").update({ is_primary: false }).eq("customer_id", customerId);
    }
    const { error } = await (supabase as any).from("customer_contacts").insert({
      company_id: companyId, customer_id: customerId, created_by: user?.id ?? null,
      full_name: form.full_name.trim(), designation: form.designation || null,
      mobile: form.mobile || null, email: form.email || null, is_primary: form.is_primary,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Contact added" });
    setOpen(false); setForm({ full_name: "", designation: "", mobile: "", email: "", is_primary: false });
    load();
  };

  const togglePrimary = async (c: C) => {
    await (supabase as any).from("customer_contacts").update({ is_primary: false }).eq("customer_id", customerId);
    await (supabase as any).from("customer_contacts").update({ is_primary: true }).eq("id", c.id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this contact?")) return;
    await (supabase as any).from("customer_contacts").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground"><Building2 className="inline h-4 w-4 mr-1" /> {rows.length} contacts</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
      </div>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No contacts yet.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((c) => (
          <Card key={c.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                {c.full_name}
                {c.is_primary && <Badge className="text-xs"><Star className="h-3 w-3 mr-1" /> Primary</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{c.designation ?? "—"} · {c.mobile ?? "—"} · {c.email ?? "—"}</div>
            </div>
            <div className="flex gap-1">
              {!c.is_primary && <Button size="sm" variant="outline" onClick={() => togglePrimary(c)}>Make Primary</Button>}
              <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
              <Label>Primary contact</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
