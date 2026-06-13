import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Car } from "lucide-react";

type Vehicle = {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  vehicle_type: string | null;
  manufacturing_year: number | null;
  fuel_type: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  rto_code: string | null;
};

export const VehiclesList = () => {
  const { companyId, user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({
    registration_number: "", make: "", model: "", vehicle_type: "Private Car",
    manufacturing_year: "", fuel_type: "Petrol", owner_name: "", owner_phone: "", rto_code: "",
  });

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles" as any)
      .select("id,registration_number,make,model,vehicle_type,manufacturing_year,fuel_type,owner_name,owner_phone,rto_code")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setVehicles((data as any) || []);
  };
  useEffect(() => { load(); }, [companyId]);

  const save = async () => {
    if (!companyId) return;
    if (!form.registration_number.trim()) return toast({ title: "Registration number required", variant: "destructive" });
    const payload = {
      ...form,
      registration_number: form.registration_number.toUpperCase().trim(),
      manufacturing_year: form.manufacturing_year ? Number(form.manufacturing_year) : null,
      company_id: companyId,
      created_by: user?.id,
    };
    const { error } = await supabase.from("vehicles" as any).insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Vehicle added" });
    setShowAdd(false);
    setForm({ registration_number: "", make: "", model: "", vehicle_type: "Private Car", manufacturing_year: "", fuel_type: "Petrol", owner_name: "", owner_phone: "", rto_code: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this vehicle and all linked records?")) return;
    const { error } = await supabase.from("vehicles" as any).delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> Vehicles ({vehicles.length})</CardTitle>
        <Button size="sm" onClick={() => setShowAdd((s) => !s)}><Plus className="h-4 w-4 mr-1" />Add Vehicle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
            <div><Label>Registration No *</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MH12AB1234" /></div>
            <div><Label>Vehicle Type</Label><Input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} /></div>
            <div><Label>Make</Label><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={form.manufacturing_year} onChange={(e) => setForm({ ...form, manufacturing_year: e.target.value })} /></div>
            <div><Label>Fuel</Label><Input value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} /></div>
            <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><Label>Owner Phone</Label><Input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} /></div>
            <div><Label>RTO Code</Label><Input value={form.rto_code} onChange={(e) => setForm({ ...form, rto_code: e.target.value })} /></div>
            <div className="md:col-span-3 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Reg No</TableHead><TableHead>Type</TableHead><TableHead>Make/Model</TableHead>
              <TableHead>Year</TableHead><TableHead>Owner</TableHead><TableHead>Phone</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (<TableRow><TableCell colSpan={7} className="text-center">Loading…</TableCell></TableRow>) :
               vehicles.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No vehicles yet</TableCell></TableRow>) :
               vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-semibold">{v.registration_number}</TableCell>
                  <TableCell>{v.vehicle_type || "—"}</TableCell>
                  <TableCell>{[v.make, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{v.manufacturing_year || "—"}</TableCell>
                  <TableCell>{v.owner_name || "—"}</TableCell>
                  <TableCell>{v.owner_phone || "—"}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
