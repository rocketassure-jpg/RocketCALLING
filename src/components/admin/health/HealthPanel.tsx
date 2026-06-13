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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Users } from "lucide-react";
import { expiryBadge } from "@/components/admin/motor/expiry-utils";

type HealthPolicy = any;

export const HealthPanel = () => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<HealthPolicy[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [planFilter, setPlanFilter] = useState<"all" | "individual" | "family_floater" | "group" | "senior_citizen">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [membersOf, setMembersOf] = useState<HealthPolicy | null>(null);

  const blankForm = {
    insurer_id: "", policy_number: "", plan_name: "", plan_type: "individual",
    cover_type: "new", proposer_name: "", proposer_phone: "",
    sum_insured: "", base_sum_insured: "", no_claim_bonus_percent: "", room_rent_limit: "", copay_percent: "",
    pre_existing_disease: "", tpa_name: "", tpa_card_number: "",
    start_date: "", end_date: "", issue_date: "",
    net_premium: "", gst_amount: "", gross_premium: "",
  };
  const [form, setForm] = useState<any>(blankForm);

  const load = async () => {
    if (!companyId) return;
    const [pRes, iRes] = await Promise.all([
      supabase.from("health_policies" as any).select("*, insurers(name)").eq("company_id", companyId).order("end_date"),
      supabase.from("insurers" as any).select("id,name").eq("company_id", companyId).order("name"),
    ]);
    if (pRes.error) toast({ title: "Failed", description: pRes.error.message, variant: "destructive" });
    setRows((pRes.data as any) || []);
    setInsurers((iRes.data as any) || []);
  };
  useEffect(() => { load(); }, [companyId]);

  const save = async () => {
    if (!companyId) return;
    const num = (v: string) => (v === "" ? null : Number(v));
    const net = num(form.net_premium) || 0;
    const gst = num(form.gst_amount) ?? Math.round(net * 0.18 * 100) / 100;
    const gross = num(form.gross_premium) ?? net + gst;
    const payload = {
      ...form,
      insurer_id: form.insurer_id || null,
      sum_insured: num(form.sum_insured), base_sum_insured: num(form.base_sum_insured),
      no_claim_bonus_percent: num(form.no_claim_bonus_percent), copay_percent: num(form.copay_percent),
      net_premium: net, gst_amount: gst, gross_premium: gross,
      company_id: companyId, created_by: user?.id,
    };
    const { error } = await supabase.from("health_policies" as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Health policy added" });
    setShowAdd(false); setForm(blankForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete policy and members?")) return;
    await supabase.from("health_policies" as any).delete().eq("id", id);
    load();
  };

  const filtered = planFilter === "all" ? rows : rows.filter((r) => r.plan_type === planFilter);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Health Insurance</h2>
        <p className="text-sm text-muted-foreground">Individual, family floater, senior citizen and group health policies.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Policies ({rows.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="individual">Individual</TabsTrigger>
                <TabsTrigger value="family_floater">Family</TabsTrigger>
                <TabsTrigger value="senior_citizen">Senior</TabsTrigger>
                <TabsTrigger value="group">Group</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => setShowAdd((s) => !s)}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
              <div><Label>Insurer</Label>
                <Select value={form.insurer_id} onValueChange={(v) => setForm({ ...form, insurer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Policy No</Label><Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></div>
              <div><Label>Plan Name</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} /></div>
              <div><Label>Plan Type</Label>
                <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="family_floater">Family Floater</SelectItem>
                    <SelectItem value="senior_citizen">Senior Citizen</SelectItem>
                    <SelectItem value="group">Group / Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cover</Label>
                <Select value={form.cover_type} onValueChange={(v) => setForm({ ...form, cover_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="portability">Portability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Proposer</Label><Input value={form.proposer_name} onChange={(e) => setForm({ ...form, proposer_name: e.target.value })} /></div>
              <div><Label>Proposer Phone</Label><Input value={form.proposer_phone} onChange={(e) => setForm({ ...form, proposer_phone: e.target.value })} /></div>
              <div><Label>Sum Insured</Label><Input type="number" value={form.sum_insured} onChange={(e) => setForm({ ...form, sum_insured: e.target.value })} /></div>
              <div><Label>Base SI</Label><Input type="number" value={form.base_sum_insured} onChange={(e) => setForm({ ...form, base_sum_insured: e.target.value })} /></div>
              <div><Label>NCB %</Label><Input type="number" value={form.no_claim_bonus_percent} onChange={(e) => setForm({ ...form, no_claim_bonus_percent: e.target.value })} /></div>
              <div><Label>Room Rent</Label><Input value={form.room_rent_limit} onChange={(e) => setForm({ ...form, room_rent_limit: e.target.value })} placeholder="Single AC / 1% of SI" /></div>
              <div><Label>Copay %</Label><Input type="number" value={form.copay_percent} onChange={(e) => setForm({ ...form, copay_percent: e.target.value })} /></div>
              <div><Label>TPA Name</Label><Input value={form.tpa_name} onChange={(e) => setForm({ ...form, tpa_name: e.target.value })} /></div>
              <div><Label>TPA Card No</Label><Input value={form.tpa_card_number} onChange={(e) => setForm({ ...form, tpa_card_number: e.target.value })} /></div>
              <div><Label>PED</Label><Input value={form.pre_existing_disease} onChange={(e) => setForm({ ...form, pre_existing_disease: e.target.value })} /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><Label>Net Premium</Label><Input type="number" value={form.net_premium} onChange={(e) => setForm({ ...form, net_premium: e.target.value })} /></div>
              <div><Label>GST (auto)</Label><Input type="number" value={form.gst_amount} onChange={(e) => setForm({ ...form, gst_amount: e.target.value })} /></div>
              <div><Label>Gross (auto)</Label><Input type="number" value={form.gross_premium} onChange={(e) => setForm({ ...form, gross_premium: e.target.value })} /></div>
              <div className="md:col-span-3 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Proposer</TableHead><TableHead>Plan</TableHead><TableHead>Insurer</TableHead>
                <TableHead>Policy No</TableHead><TableHead className="text-right">Sum Insured</TableHead>
                <TableHead>End</TableHead><TableHead></TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No policies</TableCell></TableRow>) :
                 filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.proposer_name || "—"}<div className="text-xs text-muted-foreground">{r.proposer_phone || ""}</div></TableCell>
                    <TableCell><Badge variant="outline">{r.plan_type}</Badge><div className="text-xs">{r.plan_name || ""}</div></TableCell>
                    <TableCell>{r.insurers?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.policy_number || "—"}</TableCell>
                    <TableCell className="text-right">₹{Number(r.sum_insured || 0).toLocaleString()}</TableCell>
                    <TableCell>{expiryBadge(r.end_date)}</TableCell>
                    <TableCell><Button variant="outline" size="sm" onClick={() => setMembersOf(r)}><Users className="h-3 w-3 mr-1" />Members</Button></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!membersOf} onOpenChange={(o) => !o && setMembersOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Covered Members · {membersOf?.policy_number || membersOf?.plan_name}</DialogTitle></DialogHeader>
          {membersOf && <MembersEditor policy={membersOf} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MembersEditor = ({ policy }: { policy: any }) => {
  const { companyId } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({ member_name: "", relationship: "self", date_of_birth: "", gender: "male" });
  const load = async () => {
    const { data } = await supabase.from("health_policy_members" as any).select("*").eq("policy_id", policy.id).order("created_at");
    setMembers((data as any) || []);
  };
  useEffect(() => { load(); }, [policy.id]);
  const add = async () => {
    if (!form.member_name) return;
    const age = form.date_of_birth ? Math.floor((Date.now() - new Date(form.date_of_birth).getTime()) / (365.25 * 86400000)) : null;
    await supabase.from("health_policy_members" as any).insert({ ...form, age, policy_id: policy.id, company_id: companyId });
    setForm({ member_name: "", relationship: "self", date_of_birth: "", gender: "male" });
    load();
  };
  const del = async (id: string) => { await supabase.from("health_policy_members" as any).delete().eq("id", id); load(); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Input placeholder="Name" value={form.member_name} onChange={(e) => setForm({ ...form, member_name: e.target.value })} />
        <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["self", "spouse", "son", "daughter", "father", "mother", "father_in_law", "mother_in_law", "other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add Member</Button>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Rel</TableHead><TableHead>DOB</TableHead><TableHead>Age</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {members.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No members</TableCell></TableRow>) :
           members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.member_name}</TableCell><TableCell>{m.relationship}</TableCell>
              <TableCell>{m.date_of_birth || "—"}</TableCell><TableCell>{m.age ?? "—"}</TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
