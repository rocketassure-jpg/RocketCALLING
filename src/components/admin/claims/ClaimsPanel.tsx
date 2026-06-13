import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

type Claim = {
  id: string;
  claim_number: string;
  policy_type: "motor" | "health" | "life";
  claim_type: string | null;
  incident_date: string | null;
  intimation_date: string | null;
  claim_amount: number;
  approved_amount: number;
  settled_amount: number;
  status: string;
  surveyor_name: string | null;
  hospital_name: string | null;
  garage_name: string | null;
  remarks: string | null;
  insurer_id: string | null;
  customer_id: string | null;
};

type UnifiedPolicy = {
  id: string;
  policy_type: string;
  policy_number: string;
  premium: number | null;
  sum_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

const STATUSES = [
  "intimated", "documents_pending", "surveyor_assigned",
  "under_review", "approved", "rejected", "settled", "closed",
];

const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "settled" || s === "approved") return "default";
  if (s === "rejected") return "destructive";
  if (s === "closed") return "outline";
  return "secondary";
};

export function ClaimsPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("claims");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<UnifiedPolicy[]>([]);
  const [insurers, setInsurers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [form, setForm] = useState({
    claim_number: "",
    policy_type: "motor" as "motor" | "health" | "life",
    claim_type: "",
    incident_date: "",
    claim_amount: "",
    status: "intimated",
    surveyor_name: "",
    hospital_name: "",
    garage_name: "",
    insurer_id: "",
    customer_id: "",
    remarks: "",
  });

  const load = async () => {
    setLoading(true);
    const [c, p, ins, cust] = await Promise.all([
      (supabase as any).from("claims").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("unified_policies").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("insurers").select("id,name").order("name"),
      (supabase as any).from("customers").select("id,full_name").order("full_name").limit(500),
    ]);
    setClaims((c.data as Claim[]) || []);
    setPolicies((p.data as UnifiedPolicy[]) || []);
    setInsurers((ins.data as any) || []);
    setCustomers(((cust.data as any) || []).map((x: any) => ({ id: x.id, name: x.full_name })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      claim_number: "", policy_type: "motor", claim_type: "", incident_date: "",
      claim_amount: "", status: "intimated", surveyor_name: "", hospital_name: "",
      garage_name: "", insurer_id: "", customer_id: "", remarks: "",
    });
  };

  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (c: Claim) => {
    setEditing(c);
    setForm({
      claim_number: c.claim_number,
      policy_type: c.policy_type,
      claim_type: c.claim_type || "",
      incident_date: c.incident_date || "",
      claim_amount: String(c.claim_amount || ""),
      status: c.status,
      surveyor_name: c.surveyor_name || "",
      hospital_name: c.hospital_name || "",
      garage_name: c.garage_name || "",
      insurer_id: c.insurer_id || "",
      customer_id: c.customer_id || "",
      remarks: c.remarks || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.claim_number) return toast({ title: "Claim number required", variant: "destructive" });
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", (await supabase.auth.getUser()).data.user!.id).single();
    const payload: any = {
      claim_number: form.claim_number,
      policy_type: form.policy_type,
      claim_type: form.claim_type || null,
      incident_date: form.incident_date || null,
      claim_amount: Number(form.claim_amount) || 0,
      status: form.status,
      surveyor_name: form.surveyor_name || null,
      hospital_name: form.hospital_name || null,
      garage_name: form.garage_name || null,
      insurer_id: form.insurer_id || null,
      customer_id: form.customer_id || null,
      remarks: form.remarks || null,
      company_id: (prof as any)?.company_id,
    };
    const res = editing
      ? await (supabase as any).from("claims").update(payload).eq("id", editing.id)
      : await (supabase as any).from("claims").insert(payload);
    if (res.error) return toast({ title: "Failed", description: res.error.message, variant: "destructive" });
    toast({ title: editing ? "Updated" : "Created" });
    setOpen(false); resetForm(); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this claim?")) return;
    const { error } = await (supabase as any).from("claims").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  const filteredClaims = useMemo(
    () => filterType === "all" ? claims : claims.filter(c => c.policy_type === filterType),
    [claims, filterType]
  );

  const filteredPolicies = useMemo(
    () => filterType === "all" ? policies : policies.filter(p => p.policy_type === filterType),
    [policies, filterType]
  );

  const stats = useMemo(() => {
    const open = claims.filter(c => !["settled", "closed", "rejected"].includes(c.status)).length;
    const settled = claims.filter(c => c.status === "settled").length;
    const totalClaimed = claims.reduce((s, c) => s + (Number(c.claim_amount) || 0), 0);
    const totalSettled = claims.reduce((s, c) => s + (Number(c.settled_amount) || 0), 0);
    return { open, settled, totalClaimed, totalSettled, total: claims.length };
  }, [claims]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Claims</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold text-amber-600">{stats.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Settled</div><div className="text-2xl font-bold text-green-600">{stats.settled}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Claimed (₹)</div><div className="text-lg font-bold">{stats.totalClaimed.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Settled (₹)</div><div className="text-lg font-bold">{stats.totalSettled.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="policies">Unified Policies</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="motor">Motor</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="life">Life</SelectItem>
              </SelectContent>
            </Select>
            {tab === "claims" && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Claim</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editing ? "Edit Claim" : "New Claim"}</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Claim Number *</Label><Input value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
                    <div><Label>Policy Type</Label>
                      <Select value={form.policy_type} onValueChange={(v: any) => setForm({ ...form, policy_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="motor">Motor</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="life">Life</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Claim Type</Label><Input value={form.claim_type} onChange={(e) => setForm({ ...form, claim_type: e.target.value })} placeholder="Accident / Theft / Hospitalization" /></div>
                    <div><Label>Incident Date</Label><Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></div>
                    <div><Label>Claim Amount</Label><Input type="number" value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} /></div>
                    <div><Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Insurer</Label>
                      <Select value={form.insurer_id || "none"} onValueChange={(v) => setForm({ ...form, insurer_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {insurers.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Customer</Label>
                      <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.policy_type === "motor" && (
                      <>
                        <div><Label>Surveyor</Label><Input value={form.surveyor_name} onChange={(e) => setForm({ ...form, surveyor_name: e.target.value })} /></div>
                        <div><Label>Garage</Label><Input value={form.garage_name} onChange={(e) => setForm({ ...form, garage_name: e.target.value })} /></div>
                      </>
                    )}
                    {form.policy_type === "health" && (
                      <div className="col-span-2"><Label>Hospital</Label><Input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
                    )}
                    <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Claims</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="text-muted-foreground">Loading…</div> : filteredClaims.length === 0 ? (
                <div className="text-muted-foreground text-sm py-8 text-center">No claims yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Incident</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.claim_number}</TableCell>
                          <TableCell><Badge variant="outline">{c.policy_type}</Badge></TableCell>
                          <TableCell>{c.incident_date || "—"}</TableCell>
                          <TableCell>₹{Number(c.claim_amount || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={statusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All Policies ({filteredPolicies.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="text-muted-foreground">Loading…</div> : filteredPolicies.length === 0 ? (
                <div className="text-muted-foreground text-sm py-8 text-center">No policies</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Sum</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPolicies.map(p => (
                        <TableRow key={`${p.policy_type}-${p.id}`}>
                          <TableCell className="font-medium">{p.policy_number}</TableCell>
                          <TableCell><Badge variant="outline">{p.policy_type}</Badge></TableCell>
                          <TableCell>₹{Number(p.premium || 0).toLocaleString()}</TableCell>
                          <TableCell>₹{Number(p.sum_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{p.start_date || "—"} → {p.end_date || "—"}</TableCell>
                          <TableCell><Badge variant="secondary">{p.status || "—"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
