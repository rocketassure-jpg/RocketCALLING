import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Send } from "lucide-react";

const WA_NUMBER = "919669762808";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name required").max(100),
  phone_number: z.string().trim().regex(/^[+\d\s-]{7,20}$/i, "Valid phone required"),
  vehicle_number: z.string().trim().max(20).optional().or(z.literal("")),
  insurance_type: z.enum(["Life", "Health", "Motor"]),
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

export const EnquiryForm = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone_number: "",
    vehicle_number: "",
    insurance_type: "Motor" as "Life" | "Health" | "Motor",
    message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      return toast({ title: "Check the form", description: parsed.error.issues[0].message, variant: "destructive" });
    }
    setLoading(true);
    const { error } = await supabase.from("enquiries").insert({
      customer_name: parsed.data.customer_name,
      phone_number: parsed.data.phone_number,
      vehicle_number: parsed.data.vehicle_number || null,
      insurance_type: parsed.data.insurance_type,
      message: parsed.data.message || null,
    });
    setLoading(false);
    if (error) return toast({ title: "Submit failed", description: error.message, variant: "destructive" });
    toast({ title: "Enquiry sent ✅", description: "Hamari team aapko jaldi call karegi." });
    setForm({ customer_name: "", phone_number: "", vehicle_number: "", insurance_type: "Motor", message: "" });
  };

  const waText = encodeURIComponent(
    `Mujhe apni gaadi ka insurance karwana hai, meri details ye hain:\nName: ${form.customer_name || "—"}\nPhone: ${form.phone_number || "—"}\nVehicle: ${form.vehicle_number || "—"}\nType: ${form.insurance_type}`,
  );

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle>Get a free insurance quote</CardTitle>
        <CardDescription>Bharo aur submit karo — hamari team turant call karegi. Ya seedha WhatsApp pe expert se baat karo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cn">Full name</Label>
            <Input id="cn" required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Phone number</Label>
            <Input id="ph" required inputMode="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vn">Vehicle number (optional)</Label>
            <Input id="vn" placeholder="MP09 AB 1234" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Insurance type</Label>
            <Select value={form.insurance_type} onValueChange={(v) => setForm({ ...form, insurance_type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Motor">Motor</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
                <SelectItem value="Life">Life</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="msg">Message (optional)</Label>
            <Textarea id="msg" maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
            <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit enquiry
            </Button>
            <Button asChild variant="success" size="lg" className="flex-1">
              <a href={`https://wa.me/${WA_NUMBER}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Chat with Expert on WhatsApp
              </a>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
