import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Broker = { id: string; name: string };
type Insurer = { id: string; name: string };
type Mapping = { id: string; broker_id: string; insurer_id: string; broker_code: string | null; is_active: boolean };

export const BrokerCompanyMapping = () => {
  const { companyId } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [maps, setMaps] = useState<Mapping[]>([]);
  const [broker, setBroker] = useState("");
  const [insurer, setInsurer] = useState("");
  const [code, setCode] = useState("");

  const load = async () => {
    const [b, i, m] = await Promise.all([
      supabase.from("brokers").select("id,name").order("name"),
      supabase.from("insurers").select("id,name").order("name"),
      supabase.from("broker_company_mapping").select("id,broker_id,insurer_id,broker_code,is_active"),
    ]);
    setBrokers((b.data ?? []) as any); setInsurers((i.data ?? []) as any); setMaps((m.data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!broker || !insurer || !companyId) return toast({ title: "Broker & Insurer chuno", variant: "destructive" });
    const { error } = await supabase.from("broker_company_mapping").insert({ company_id: companyId, broker_id: broker, insurer_id: insurer, broker_code: code || null });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Mapping added" }); setBroker(""); setInsurer(""); setCode(""); load();
  };
  const toggle = async (m: Mapping) => {
    await supabase.from("broker_company_mapping").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };
  const del = async (id: string) => {
    await supabase.from("broker_company_mapping").delete().eq("id", id);
    load();
  };

  const brokerName = (id: string) => brokers.find((b) => b.id === id)?.name ?? "—";
  const insurerName = (id: string) => insurers.find((i) => i.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /> Map Broker ↔ Insurance Company</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5"><Label>Broker</Label>
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
              <SelectContent>{brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Insurer</Label>
            <Select value={insurer} onValueChange={setInsurer}>
              <SelectTrigger><SelectValue placeholder="Select insurer" /></SelectTrigger>
              <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Broker Code (with insurer)</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BRK-1234" /></div>
          <div className="flex items-end"><Button variant="hero" className="w-full" onClick={add}><Plus className="h-4 w-4" /> Add</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active mappings ({maps.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Broker</TableHead><TableHead>Insurer</TableHead><TableHead>Code</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {maps.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No mappings.</TableCell></TableRow>
              ) : maps.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{brokerName(m.broker_id)}</TableCell>
                  <TableCell>{insurerName(m.insurer_id)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.broker_code || "—"}</TableCell>
                  <TableCell><Switch checked={m.is_active} onCheckedChange={() => toggle(m)} /></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
