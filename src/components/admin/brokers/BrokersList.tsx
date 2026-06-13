import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";

type Broker = {
  id: string; name: string; contact_person: string | null; mobile: string | null;
  email: string | null; pan: string | null; gstin: string | null;
  agreement_start: string | null; agreement_end: string | null;
  status: string;
};
type Insurer = { id: string; name: string };
type Mapping = { id: string; broker_id: string; insurer_id: string; broker_code: string | null; is_active: boolean };

const empty = { name: "", contact_person: "", mobile: "", email: "", pan: "", gstin: "", agreement_start: "", agreement_end: "", status: "active", notes: "" };

export const BrokersList = () => {
  const { companyId, user } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Broker | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [mapBroker, setMapBroker] = useState<Broker | null>(null);
  const [mapCode, setMapCode] = useState<Record<string, string>>({});

  const load = async () => {
    const [b, i, m] = await Promise.all([
      (supabase as any).from("brokers").select("*").order("name"),
      supabase.from("insurers").select("id,name").order("name"),
      (supabase as any).from("broker_company_mapping").select("*"),
    ]);
    setBrokers((b.data ?? []) as Broker[]);
    setInsurers((i.data ?? []) as Insurer[]);
    setMappings((m.data ?? []) as Mapping[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !companyId) return toast({ title: "Name required", variant: "destructive" });
    const payload: any = {
      name: form.name.trim(), contact_person: form.contact_person || null,
      mobile: form.mobile || null, email: form.email || null,
      pan: form.pan ? form.pan.toUpperCase() : null, gstin: form.gstin ? form.gstin.toUpperCase() : null,
      agreement_start: form.agreement_start || null, agreement_end: form.agreement_end || null,
      status: form.status, notes: form.notes || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from("brokers").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      payload.company_id = companyId; payload.created_by = user?.id ?? null;
      const { error } = await (supabase as any).from("brokers").insert(payload);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    toast({ title: editing ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete broker?")) return;
    const { error } = await (supabase as any).from("brokers").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  const startEdit = (b: Broker) => {
    setEditing(b);
    setForm({
      name: b.name, contact_person: b.contact_person ?? "", mobile: b.mobile ?? "",
      email: b.email ?? "", pan: b.pan ?? "", gstin: b.gstin ?? "",
      agreement_start: b.agreement_start ?? "", agreement_end: b.agreement_end ?? "",
      status: b.status, notes: "",
    });
    setOpen(true);
  };

  const toggleMap = async (insurerId: string, present: boolean, broker: Broker) => {
    if (present) {
      const m = mappings.find((x) => x.broker_id === broker.id && x.insurer_id === insurerId);
      if (m) await (supabase as any).from("broker_company_mapping").delete().eq("id", m.id);
    } else {
      await (supabase as any).from("broker_company_mapping").insert({
        company_id: companyId, broker_id: broker.id, insurer_id: insurerId,
        broker_code: mapCode[insurerId] || null, is_active: true,
      });
    }
    load();
  };

  const updateMapCode = async (m: Mapping, code: string) => {
    await (supabase as any).from("broker_company_mapping").update({ broker_code: code || null }).eq("id", m.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Master list of brokers/MISP partners.</p>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add Broker</Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Mobile</TableHead>
              <TableHead>Agreement</TableHead><TableHead>Insurers</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {brokers.map((b) => {
                const count = mappings.filter((m) => m.broker_id === b.id).length;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs">{b.contact_person ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.mobile ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {b.agreement_start && b.agreement_end ? `${b.agreement_start} → ${b.agreement_end}` : "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{count}</Badge></TableCell>
                    <TableCell><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button size="sm" variant="outline" onClick={() => setMapBroker(b)}><LinkIcon className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(b)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!brokers.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No brokers yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit broker" : "Add broker"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>PAN</Label><Input maxLength={10} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></div>
            <div><Label>GSTIN</Label><Input maxLength={15} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Agreement Start</Label><Input type="date" value={form.agreement_start} onChange={(e) => setForm({ ...form, agreement_start: e.target.value })} /></div>
            <div><Label>Agreement End</Label><Input type="date" value={form.agreement_end} onChange={(e) => setForm({ ...form, agreement_end: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insurer mapping dialog */}
      <Dialog open={!!mapBroker} onOpenChange={(o) => !o && setMapBroker(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Map insurers — {mapBroker?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {insurers.map((i) => {
              const m = mappings.find((x) => x.broker_id === mapBroker?.id && x.insurer_id === i.id);
              return (
                <div key={i.id} className="flex items-center gap-2 rounded border p-2">
                  <Checkbox checked={!!m} onCheckedChange={() => mapBroker && toggleMap(i.id, !!m, mapBroker)} />
                  <div className="flex-1 font-medium">{i.name}</div>
                  <Input
                    placeholder="Broker code"
                    className="w-40"
                    defaultValue={m?.broker_code ?? mapCode[i.id] ?? ""}
                    onChange={(e) => {
                      if (m) updateMapCode(m, e.target.value);
                      else setMapCode((s) => ({ ...s, [i.id]: e.target.value }));
                    }}
                  />
                </div>
              );
            })}
            {!insurers.length && <p className="py-4 text-center text-xs text-muted-foreground">Add insurers under Accounts → Insurers first.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
