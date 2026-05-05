import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { User, Sparkles, Flag, MoreHorizontal, Loader2 } from "lucide-react";

type Area = { id: string; name: string };
type CrmField = { id: string; name: string; field_type: string; mandatory: boolean };

const today = () => new Date().toISOString().slice(0, 10);

export const AddCustomerForm = ({ areas, telecallers = [], onDone }: { areas: Area[]; telecallers?: { id: string; full_name: string }[]; onDone?: () => void }) => {
  const [fields, setFields] = useState<CrmField[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", phone_number: "", email: "", area_id: "",
    policy_type: "Motor" as "Life" | "Health" | "Motor",
    call_date: today(), premium_amount: "0",
    priority: "Medium",
    notes: "",
    assigned_telecaller: "none",
  });
  const [custom, setCustom] = useState<Record<string, string>>({});

  useEffect(() => { supabase.from("crm_fields").select("*").order("sort_order").then(({ data }) => setFields((data as any) ?? [])); }, []);

  const submit = async () => {
    if (!form.customer_name || !form.phone_number || !form.area_id) return toast({ title: "Fill required fields", variant: "destructive" });
    for (const f of fields) {
      if (f.mandatory && !custom[f.id]) return toast({ title: `${f.name} is required`, variant: "destructive" });
    }
    setSaving(true);
    const customNotes = fields.length ? `\n\nCustom Fields:\n${fields.map((f) => `${f.name}: ${custom[f.id] || "—"}`).join("\n")}` : "";
    const { error } = await supabase.from("leads").insert({
      customer_name: form.customer_name,
      phone_number: form.phone_number,
      area_id: form.area_id,
      policy_type: form.policy_type,
      call_date: form.call_date,
      premium_amount: Number(form.premium_amount || 0),
      assigned_telecaller: form.assigned_telecaller !== "none" ? form.assigned_telecaller : null,
      notes: `Priority: ${form.priority}\nEmail: ${form.email || "—"}\n${form.notes}${customNotes}`,
    });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Customer added ✅" });
    setForm({ customer_name: "", phone_number: "", email: "", area_id: "", policy_type: "Motor", call_date: today(), premium_amount: "0", priority: "Medium", notes: "", assigned_telecaller: "none" });
    setCustom({});
    onDone?.();
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <Accordion type="multiple" defaultValue={["personal"]} className="w-full">
          <AccordionItem value="personal">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Information</div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pt-2 md:grid-cols-2">
                <div className="space-y-2"><Label>Full name *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone number *</Label><Input inputMode="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Area *</Label>
                  <Select value={form.area_id} onValueChange={(v) => setForm({ ...form, area_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                    <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Policy type</Label>
                  <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Health">Health</SelectItem><SelectItem value="Life">Life</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Call date</Label><Input type="date" value={form.call_date} onChange={(e) => setForm({ ...form, call_date: e.target.value })} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Custom Fields {fields.length ? `(${fields.length})` : ""}</div>
            </AccordionTrigger>
            <AccordionContent>
              {!fields.length ? <p className="py-4 text-sm text-muted-foreground">No custom fields defined. Admin can add fields under CRM Fields.</p> : (
                <div className="grid gap-4 pt-2 md:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.id} className="space-y-2">
                      <Label>{f.name} {f.mandatory && <span className="text-destructive">*</span>}</Label>
                      <Input type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                        value={custom[f.id] || ""} onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="priority">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-primary" /> Priority</div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pt-2 md:grid-cols-2">
                <div className="space-y-2"><Label>Priority level</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Premium amount ₹</Label><Input type="number" value={form.premium_amount} onChange={(e) => setForm({ ...form, premium_amount: e.target.value })} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="others">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2"><MoreHorizontal className="h-4 w-4 text-primary" /> Others</div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button variant="hero" size="lg" className="mt-6 w-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Add Customer
        </Button>
      </CardContent>
    </Card>
  );
};
