import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";

const VARIABLES = ["{customer_name}", "{policy_type}", "{expiry_date}", "{premium_amount}", "{agent_name}"];

type Tpl = { id: string; name: string; channel: string; body_text: string; is_active: boolean };

export const RenewalTemplates = () => {
  const { companyId } = useAuth();
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [form, setForm] = useState({ name: "", channel: "whatsapp", body_text: "Hi {customer_name}, aapki {policy_type} policy {expiry_date} ko expire ho rahi hai. Renew karne ke liye reply karein." });

  const load = () => supabase.from("renewal_templates").select("id,name,channel,body_text,is_active").order("created_at", { ascending: false }).then(({ data }) => setTpls((data ?? []) as any));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.body_text.trim() || !companyId) return toast({ title: "Name aur body chahiye", variant: "destructive" });
    const { error } = await supabase.from("renewal_templates").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Template saved" });
    setForm({ name: "", channel: "whatsapp", body_text: "" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await supabase.from("renewal_templates").delete().eq("id", id); load();
  };

  const toggle = async (id: string, v: boolean) => { await supabase.from("renewal_templates").update({ is_active: v }).eq("id", id); load(); };

  const insertVar = (v: string) => setForm((f) => ({ ...f, body_text: f.body_text + " " + v }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create Template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Channel</Label>
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Body</Label><Textarea rows={5} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} /></div>
          <div className="flex flex-wrap gap-1">
            {VARIABLES.map(v => <Badge key={v} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => insertVar(v)}>{v}</Badge>)}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Preview</div>
            {form.body_text
              .replace("{customer_name}", "Ramesh")
              .replace("{policy_type}", "Motor")
              .replace("{expiry_date}", "25 Jun 2026")
              .replace("{premium_amount}", "₹12,500")
              .replace("{agent_name}", "Rocket Agent")}
          </div>
          <Button variant="hero" onClick={save}><Save className="h-4 w-4" /> Save Template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Templates ({tpls.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tpls.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Koi template nahi. Pehla banao.</div>}
          {tpls.map(t => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{t.name} <Badge variant="outline" className="ml-1">{t.channel}</Badge></div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.body_text.slice(0, 120)}{t.body_text.length > 120 ? "…" : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={t.is_active} onCheckedChange={(v) => toggle(t.id, v)} />
                  <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
