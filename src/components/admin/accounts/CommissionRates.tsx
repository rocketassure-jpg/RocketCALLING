import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const CommissionRates = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const empty = { insurer_id: "", policy_type: "motor_pvt_car_od", product_subtype: "", od_rate: 0, tp_rate: 0, net_rate: 0, reward_rate: 0, effective_from: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [r, i] = await Promise.all([
      supabase.from("commission_rates").select("*, insurers(name)").order("created_at", { ascending: false }),
      supabase.from("insurers").select("id,name").order("name"),
    ]);
    setRows(r.data ?? []); setInsurers(i.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.insurer_id || !companyId) return toast({ title: "Pick an insurer", variant: "destructive" });
    const { error } = await supabase.from("commission_rates").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setOpen(false); setForm(empty); load();
  };
  const del = async (id: string) => { await supabase.from("commission_rates").delete().eq("id", id); load(); };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Commission Rates ({rows.length})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> Add Rate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Commission Rate</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>Insurer *</Label>
                  <Select value={form.insurer_id} onValueChange={(v) => setForm({ ...form, insurer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick insurer" /></SelectTrigger>
                    <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Policy Type</Label>
                  <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motor_pvt_car_od">Motor — Pvt Car OD</SelectItem>
                      <SelectItem value="motor_pvt_car_tp">Motor — Pvt Car TP</SelectItem>
                      <SelectItem value="motor_2w">Motor — 2 Wheeler</SelectItem>
                      <SelectItem value="motor_comm">Motor — Commercial</SelectItem>
                      <SelectItem value="health_indv">Health — Individual</SelectItem>
                      <SelectItem value="health_family">Health — Family Floater</SelectItem>
                      <SelectItem value="health_group">Health — Group</SelectItem>
                      <SelectItem value="life_term">Life — Term</SelectItem>
                      <SelectItem value="life_endow">Life — Endowment</SelectItem>
                      <SelectItem value="life_ulip">Life — ULIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Subtype</Label><Input value={form.product_subtype} onChange={(e) => setForm({ ...form, product_subtype: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>OD %</Label><Input type="number" step="0.01" value={form.od_rate} onChange={(e) => setForm({ ...form, od_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>TP %</Label><Input type="number" step="0.01" value={form.tp_rate} onChange={(e) => setForm({ ...form, tp_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Net %</Label><Input type="number" step="0.01" value={form.net_rate} onChange={(e) => setForm({ ...form, net_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Reward %</Label><Input type="number" step="0.01" value={form.reward_rate} onChange={(e) => setForm({ ...form, reward_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
              </div>
              <Button variant="hero" onClick={save}>Create</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Insurer</TableHead><TableHead>Policy Type</TableHead><TableHead>Subtype</TableHead>
            <TableHead>OD%</TableHead><TableHead>TP%</TableHead><TableHead>Net%</TableHead><TableHead>Reward%</TableHead>
            <TableHead>From</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.insurers?.name}</TableCell>
                <TableCell className="text-xs">{r.policy_type}</TableCell>
                <TableCell>{r.product_subtype || "—"}</TableCell>
                <TableCell>{r.od_rate}</TableCell><TableCell>{r.tp_rate}</TableCell>
                <TableCell>{r.net_rate}</TableCell><TableCell>{r.reward_rate}</TableCell>
                <TableCell className="text-xs">{r.effective_from}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No rates configured.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
