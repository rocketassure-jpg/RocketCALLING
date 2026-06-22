import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type FM = { id: string; full_name: string; relation: string; dob: string | null; gender: string | null; mobile: string | null; is_dependent: boolean };
const RELATIONS = ["spouse", "son", "daughter", "father", "mother", "brother", "sister", "dependent", "other"];

export const FamilyMembersTab = ({ customerId }: { customerId: string }) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<FM[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", relation: "spouse", dob: "", gender: "", mobile: "", is_dependent: true });

  const load = async () => {
    const { data } = await (supabase as any).from("customer_family_members").select("*").eq("customer_id", customerId).order("created_at");
    setRows((data ?? []) as FM[]);
  };
  useEffect(() => { load(); }, [customerId]);

  const save = async () => {
    if (!form.full_name.trim() || !companyId) return toast({ title: "Name required", variant: "destructive" });
    const { error } = await (supabase as any).from("customer_family_members").insert({
      company_id: companyId, customer_id: customerId, created_by: user?.id ?? null,
      full_name: form.full_name.trim(), relation: form.relation,
      dob: form.dob || null, gender: form.gender || null, mobile: form.mobile || null,
      is_dependent: form.is_dependent,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Family member added" });
    setOpen(false); setForm({ full_name: "", relation: "spouse", dob: "", gender: "", mobile: "", is_dependent: true });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    await (supabase as any).from("customer_family_members").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground"><Users className="inline h-4 w-4 mr-1" /> {rows.length} family members</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Family Member</Button>
      </div>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No family members yet.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((m) => (
          <Card key={m.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.full_name} <Badge variant="outline" className="ml-1 text-xs">{m.relation}</Badge></div>
              <div className="text-xs text-muted-foreground">{m.dob ?? "—"} · {m.gender ?? "—"} · {m.mobile ?? "—"}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add family member</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div>
              <Label>Relation</Label>
              <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>DOB</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
