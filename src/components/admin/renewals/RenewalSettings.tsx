import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";

const ALERT_OPTIONS = [1, 7, 15, 30, 60];

export const RenewalSettings = () => {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [s, setS] = useState<any>({
    default_telecaller_id: "",
    alert_days: [7, 15, 30],
    default_channel: "whatsapp",
    auto_assign_logic: "original_then_default",
    auto_send_enabled: false,
    default_template_id: "",
  });

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [tc, tp, set] = await Promise.all([
        supabase.from("profiles").select("id,full_name,id, user_roles!inner(role)"),
        supabase.from("renewal_templates").select("id,name,channel").eq("is_active", true),
        supabase.from("admin_renewal_settings").select("*").eq("company_id", companyId).maybeSingle(),
      ]);
      const tcs = (tc.data ?? []).filter((p: any) => p.user_roles?.some((r: any) => r.role === "telecaller"));
      setTelecallers(tcs); setTemplates(tp.data ?? []);
      if (set.data) setS({ ...s, ...set.data, default_telecaller_id: set.data.default_telecaller_id ?? "", default_template_id: set.data.default_template_id ?? "" });
      setLoading(false);
    })();
  }, [companyId]);

  const toggleDay = (d: number) => setS({ ...s, alert_days: s.alert_days.includes(d) ? s.alert_days.filter((x: number) => x !== d) : [...s.alert_days, d].sort((a: number, b: number) => a - b) });

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const payload = {
      company_id: companyId,
      default_telecaller_id: s.default_telecaller_id || null,
      alert_days: s.alert_days,
      default_channel: s.default_channel,
      auto_assign_logic: s.auto_assign_logic,
      auto_send_enabled: s.auto_send_enabled,
      default_template_id: s.default_template_id || null,
    };
    const { error } = await supabase.from("admin_renewal_settings").upsert(payload, { onConflict: "company_id" });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Renewal settings saved" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filteredTpl = templates.filter(t => t.channel === s.default_channel);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewal Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default Renewal Telecaller</Label>
            <Select value={s.default_telecaller_id || "none"} onValueChange={(v) => setS({ ...s, default_telecaller_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select telecaller" /></SelectTrigger>
              <SelectContent><SelectItem value="none">None</SelectItem>{telecallers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Outreach Channel</Label>
            <Select value={s.default_channel} onValueChange={(v) => setS({ ...s, default_channel: v, default_template_id: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="manual">Manual (no auto-send)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Alert Days Before Expiry</Label>
          <div className="flex flex-wrap gap-3">
            {ALERT_OPTIONS.map(d => (
              <label key={d} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Checkbox checked={s.alert_days.includes(d)} onCheckedChange={() => toggleDay(d)} /> T-{d} days
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Auto-Assign Logic</Label>
          <Select value={s.auto_assign_logic} onValueChange={(v) => setS({ ...s, auto_assign_logic: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="original_only">Original telecaller only</SelectItem>
              <SelectItem value="default_only">Always default telecaller</SelectItem>
              <SelectItem value="original_then_default">Original first, fallback to default</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Template (for auto-send)</Label>
          <Select value={s.default_template_id || "none"} onValueChange={(v) => setS({ ...s, default_template_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent><SelectItem value="none">None</SelectItem>{filteredTpl.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">Auto-send Reminders</div>
            <div className="text-xs text-muted-foreground">Cron har din selected alert days par default template bhejega</div>
          </div>
          <Switch checked={s.auto_send_enabled} onCheckedChange={(v) => setS({ ...s, auto_send_enabled: v })} />
        </div>

        <Button variant="hero" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings</Button>
      </CardContent>
    </Card>
  );
};
