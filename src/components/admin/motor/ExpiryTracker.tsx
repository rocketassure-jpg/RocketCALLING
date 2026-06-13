import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { expiryBadge, expiryBucket, daysUntil } from "./expiry-utils";

type Field = { key: string; label: string; type?: "text" | "date" | "number"; required?: boolean };

interface Props {
  table: "puc_records" | "fitness_certificates" | "permits" | "rc_register";
  title: string;
  expiryColumn: string;
  extraFields: Field[];
}

export const ExpiryTracker = ({ table, title, expiryColumn, extraFields }: Props) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "expired" | "30" | "60">("all");
  const initialForm = useMemo(() => {
    const f: any = { vehicle_id: "", [expiryColumn]: "" };
    extraFields.forEach((x) => (f[x.key] = ""));
    return f;
  }, [extraFields, expiryColumn]);
  const [form, setForm] = useState<any>(initialForm);

  const load = async () => {
    if (!companyId) return;
    const [rRes, vRes] = await Promise.all([
      supabase.from(table as any).select("*, vehicles(registration_number, owner_name, owner_phone)").eq("company_id", companyId).order(expiryColumn, { ascending: true }),
      supabase.from("vehicles" as any).select("id,registration_number").eq("company_id", companyId).order("registration_number"),
    ]);
    if (rRes.error) toast({ title: "Failed", description: rRes.error.message, variant: "destructive" });
    setRows((rRes.data as any) || []);
    setVehicles((vRes.data as any) || []);
  };
  useEffect(() => { load(); }, [companyId, table]);

  const save = async () => {
    if (!companyId || !form.vehicle_id) return toast({ title: "Select vehicle", variant: "destructive" });
    if (!form[expiryColumn]) return toast({ title: "Expiry date required", variant: "destructive" });
    const payload: any = { ...form, company_id: companyId, created_by: user?.id };
    extraFields.forEach((x) => {
      if (x.type === "number" && payload[x.key] !== "") payload[x.key] = Number(payload[x.key]);
      if (payload[x.key] === "") payload[x.key] = null;
    });
    const { error } = await supabase.from(table as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setShowAdd(false);
    setForm(initialForm);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from(table as any).delete().eq("id", id);
    load();
  };

  const filtered = rows.filter((r) => {
    const b = expiryBucket(r[expiryColumn]);
    if (filter === "all") return true;
    if (filter === "expired") return b === "expired";
    if (filter === "30") return b === "expired" || b === "7" || b === "15" || b === "30";
    if (filter === "60") return b !== "ok";
    return true;
  });

  const counts = {
    expired: rows.filter((r) => expiryBucket(r[expiryColumn]) === "expired").length,
    d30: rows.filter((r) => { const b = expiryBucket(r[expiryColumn]); return b === "7" || b === "15" || b === "30"; }).length,
    d60: rows.filter((r) => expiryBucket(r[expiryColumn]) === "60").length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>{title} ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expired">Expired ({counts.expired})</TabsTrigger>
              <TabsTrigger value="30">≤30d ({counts.d30})</TabsTrigger>
              <TabsTrigger value="60">≤60d ({counts.d30 + counts.d60})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setShowAdd((s) => !s)}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
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
              <Label>Expiry Date *</Label>
              <Input type="date" value={form[expiryColumn]} onChange={(e) => setForm({ ...form, [expiryColumn]: e.target.value })} />
            </div>
            {extraFields.map((f) => (
              <div key={f.key}>
                <Label>{f.label}{f.required ? " *" : ""}</Label>
                <Input type={f.type || "text"} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div className="md:col-span-3 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vehicle</TableHead><TableHead>Owner</TableHead>
              {extraFields.slice(0, 2).map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              <TableHead>Expiry Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (<TableRow><TableCell colSpan={5 + Math.min(extraFields.length, 2)} className="text-center text-muted-foreground">No records</TableCell></TableRow>) :
               filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.vehicles?.registration_number || "—"}</TableCell>
                  <TableCell className="text-xs">{r.vehicles?.owner_name || "—"}{r.vehicles?.owner_phone ? ` · ${r.vehicles.owner_phone}` : ""}</TableCell>
                  {extraFields.slice(0, 2).map((f) => <TableCell key={f.key}>{r[f.key] ?? "—"}</TableCell>)}
                  <TableCell>{r[expiryColumn] || "—"}</TableCell>
                  <TableCell>{expiryBadge(r[expiryColumn])}</TableCell>
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
