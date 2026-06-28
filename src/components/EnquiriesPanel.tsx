import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Check, Loader2, Inbox, UserPlus } from "lucide-react";

type Enquiry = {
  id: string;
  customer_name: string;
  phone_number: string;
  vehicle_number: string | null;
  insurance_type: "Life" | "Health" | "Motor";
  message: string | null;
  handled: boolean;
  converted_lead_id: string | null;
  created_at: string;
};

export const EnquiriesPanel = () => {
  const { user, companyId } = useAuth();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [convertOpen, setConvertOpen] = useState(false);
  const [active, setActive] = useState<Enquiry | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("areas").select("id,name").order("name").then(({ data }) => {
      setAreas((data ?? []) as any);
    });
  }, []);

  const markHandled = async (id: string) => {
    const { error } = await supabase.from("enquiries").update({ handled: true }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, handled: true } : x)));
  };

  const openConvert = (e: Enquiry) => {
    setActive(e);
    setName(e.customer_name);
    setPhone(e.phone_number);
    setNotes(e.message ?? "");
    setAreaId(areas[0]?.id ?? "");
    setConvertOpen(true);
  };

  const convert = async () => {
    if (!active || !companyId) return;
    if (!name.trim() || !phone.trim() || !areaId) {
      return toast({ title: "Name, phone aur area zaroori hai", variant: "destructive" });
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: lead, error } = await supabase.from("leads").insert({
        company_id: companyId,
        customer_name: name.trim(),
        phone_number: phone.trim(),
        area_id: areaId,
        policy_type: active.insurance_type as any,
        status: "New" as any,
        call_date: today,
        premium_amount: 0,
        priority: "medium",
        notes: notes.trim() || null,
        source: "enquiry",
      } as any).select("id").maybeSingle();
      if (error) throw error;
      await supabase.from("enquiries").update({ handled: true, converted_lead_id: lead?.id ?? null }).eq("id", active.id);
      toast({ title: "Lead ban gaya!", description: "Calling list mein dikhega." });
      setConvertOpen(false);
      setActive(null);
      load();
    } catch (e: any) {
      toast({ title: "Convert failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const newCount = items.filter((x) => !x.handled).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Customer enquiries
            {newCount > 0 && <Badge className="bg-primary text-primary-foreground">{newCount} new</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No enquiries yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className={e.handled ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      {e.customer_name}
                      {!e.handled && <Badge className="ml-2 bg-primary text-primary-foreground">NEW</Badge>}
                      {e.converted_lead_id && <Badge variant="outline" className="ml-2">Lead created</Badge>}
                    </TableCell>
                    <TableCell>{e.phone_number}</TableCell>
                    <TableCell>{e.vehicle_number || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{e.insurance_type}</Badge></TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{e.message || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="hero">
                          <a href={`tel:${e.phone_number}`}><Phone className="h-4 w-4" /></a>
                        </Button>
                        <Button asChild size="sm" variant="success">
                          <a href={`https://wa.me/${e.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                        {!e.converted_lead_id && (
                          <Button size="sm" variant="hero" onClick={() => openConvert(e)}>
                            <UserPlus className="h-4 w-4" /> Convert to Lead
                          </Button>
                        )}
                        {!e.handled && (
                          <Button size="sm" variant="outline" onClick={() => markHandled(e.id)}>
                            <Check className="h-4 w-4" /> Done
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Convert Enquiry → Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Policy type</Label>
              <Input value={active?.insurance_type ?? ""} disabled />
            </div>
            <div>
              <Label>Area *</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={convert} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
