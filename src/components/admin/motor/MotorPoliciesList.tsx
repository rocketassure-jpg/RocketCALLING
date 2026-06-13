import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText } from "lucide-react";
import { expiryBadge } from "./expiry-utils";

type Row = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  cover_type: string | null;
  start_date: string | null;
  end_date: string | null;
  idv: number | null;
  gross_premium: number | null;
  status: string | null;
  vehicles: { registration_number: string } | null;
  insurers: { name: string } | null;
};

export const MotorPoliciesList = () => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({
    vehicle_id: "", insurer_id: "", policy_number: "", policy_type: "comprehensive",
    cover_type: "renewal", start_date: "", end_date: "",
    idv: "", od_premium: "", tp_premium: "", addon_premium: "", gst_amount: "", gross_premium: "",
    ncb_percent: "",
  });

  const load = async () => {
    if (!companyId) return;
    const [pRes, vRes, iRes] = await Promise.all([
      supabase.from("motor_policies" as any).select("*, vehicles(registration_number), insurers(name)").eq("company_id", companyId).order("end_date", { ascending: true }),
      supabase.from("vehicles" as any).select("id,registration_number").eq("company_id", companyId).order("registration_number"),
      supabase.from("insurers" as any).select("id,name").eq("company_id", companyId).order("name"),
    ]);
    if (pRes.error) toast({ title: "Failed", description: pRes.error.message, variant: "destructive" });
    setRows((pRes.data as any) || []);
    setVehicles((vRes.data as any) || []);
    setInsurers((iRes.data as any) || []);
  };
  useEffect(() => { load(); }, [companyId]);

  const save = async () => {
    if (!companyId || !form.vehicle_id) return toast({ title: "Select vehicle", variant: "destructive" });
    const num = (v: string) => (v === "" ? null : Number(v));
    const od = num(form.od_premium) || 0;
    const tp = num(form.tp_premium) || 0;
    const addon = num(form.addon_premium) || 0;
    const net = od + tp + addon;
    const gst = num(form.gst_amount) ?? Math.round(net * 0.18 * 100) / 100;
    const gross = num(form.gross_premium) ?? net + gst;
    const payload = {
      ...form,
      idv: num(form.idv), od_premium: od, tp_premium: tp, addon_premium: addon,
      net_premium: net, gst_amount: gst, gross_premium: gross,
      ncb_percent: num(form.ncb_percent),
      insurer_id: form.insurer_id || null,
      company_id: companyId, created_by: user?.id,
    };
    const { error } = await supabase.from("motor_policies" as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Policy added" });
    setShowAdd(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete policy?")) return;
    const { error } = await supabase.from("motor_policies" as any).delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Motor Policies ({rows.length})</CardTitle>
        <Button size="sm" onClick={() => setShowAdd((s) => !s)}><Plus className="h-4 w-4 mr-1" />Add Policy</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Insurer</Label>
              <Select value={form.insurer_id} onValueChange={(v) => setForm({ ...form, insurer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Policy No</Label><Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="own_damage">Own Damage</SelectItem>
                  <SelectItem value="standalone_od">Standalone OD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cover Type</Label>
              <Select value={form.cover_type} onValueChange={(v) => setForm({ ...form, cover_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="renewal">Renewal</SelectItem>
                  <SelectItem value="rollover">Rollover</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>IDV</Label><Input type="number" value={form.idv} onChange={(e) => setForm({ ...form, idv: e.target.value })} /></div>
            <div><Label>NCB %</Label><Input type="number" value={form.ncb_percent} onChange={(e) => setForm({ ...form, ncb_percent: e.target.value })} /></div>
            <div><Label>OD Premium</Label><Input type="number" value={form.od_premium} onChange={(e) => setForm({ ...form, od_premium: e.target.value })} /></div>
            <div><Label>TP Premium</Label><Input type="number" value={form.tp_premium} onChange={(e) => setForm({ ...form, tp_premium: e.target.value })} /></div>
            <div><Label>Add-on Premium</Label><Input type="number" value={form.addon_premium} onChange={(e) => setForm({ ...form, addon_premium: e.target.value })} /></div>
            <div><Label>GST (auto if blank)</Label><Input type="number" value={form.gst_amount} onChange={(e) => setForm({ ...form, gst_amount: e.target.value })} /></div>
            <div><Label>Gross Premium (auto)</Label><Input type="number" value={form.gross_premium} onChange={(e) => setForm({ ...form, gross_premium: e.target.value })} /></div>
            <div className="md:col-span-3 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vehicle</TableHead><TableHead>Insurer</TableHead><TableHead>Policy No</TableHead>
              <TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Expiry</TableHead>
              <TableHead className="text-right">Premium</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No policies yet</TableCell></TableRow>) :
               rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.vehicles?.registration_number || "—"}</TableCell>
                  <TableCell>{r.insurers?.name || "—"}</TableCell>
                  <TableCell>{r.policy_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.policy_type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.start_date} → {r.end_date}</TableCell>
                  <TableCell>{expiryBadge(r.end_date)}</TableCell>
                  <TableCell className="text-right">₹{(r.gross_premium || 0).toLocaleString()}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
