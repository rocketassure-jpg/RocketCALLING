import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Download } from "lucide-react";

type Settings = {
  id: string;
  whatsapp_business_messaging: boolean;
  whatsapp_notifications: boolean;
  post_interaction_actions: boolean;
  auto_start_allocation: boolean;
  variable_retry_enabled: boolean;
  retry_1_hours: number;
  retry_2_hours: number;
  allow_logout_mobile: boolean;
  allow_logout_web: boolean;
  master_sheet_url: string | null;
};

const Row = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b py-4 last:border-0">
    <div className="flex-1">
      <div className="font-medium">{title}</div>
      {desc && <div className="text-sm text-muted-foreground">{desc}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const GeneralSettings = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncSheet = async () => {
    if (!s?.master_sheet_url) return toast({ title: "Add a Sheet URL first", variant: "destructive" });
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sheets-sync", { body: { sheet_url: s.master_sheet_url } });
    setSyncing(false);
    if (error || data?.error) return toast({ title: "Sync failed", description: data?.error || error?.message, variant: "destructive" });
    toast({ title: "Synced ✅", description: `${data.inserted} imported, ${data.skipped} skipped (of ${data.total})` });
  };

  useEffect(() => {
    supabase.from("app_settings").select("*").limit(1).single().then(({ data }) => setS(data as any));
  }, []);

  if (!s) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const update = (patch: Partial<Settings>) => setS({ ...s, ...patch });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({
      whatsapp_business_messaging: s.whatsapp_business_messaging,
      whatsapp_notifications: s.whatsapp_notifications,
      post_interaction_actions: s.post_interaction_actions,
      auto_start_allocation: s.auto_start_allocation,
      variable_retry_enabled: s.variable_retry_enabled,
      retry_1_hours: s.retry_1_hours,
      retry_2_hours: s.retry_2_hours,
      allow_logout_mobile: s.allow_logout_mobile,
      allow_logout_web: s.allow_logout_web,
      master_sheet_url: s.master_sheet_url,
    }).eq("id", s.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Settings saved" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">General Settings</h1>
          <p className="text-sm text-muted-foreground">Communication, allocation, retry & security</p>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Master Google Sheet</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Label>Master Sheet URL</Label>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={s.master_sheet_url ?? ""}
            onChange={(e) => update({ master_sheet_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Paste your master Google Sheet link. Make sure it's shared as 'Anyone with link can view'. Click Sync to import new leads.</p>
          <Button variant="outline" size="sm" onClick={syncSheet} disabled={syncing || !s.master_sheet_url}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sync now
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Communication</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Row title="WhatsApp Business Messaging" desc="Send messages via WhatsApp Business API">
            <Switch checked={s.whatsapp_business_messaging} onCheckedChange={(v) => update({ whatsapp_business_messaging: v })} />
          </Row>
          <Row title="WhatsApp Notifications" desc="Notify managers about new enquiries on WhatsApp">
            <Switch checked={s.whatsapp_notifications} onCheckedChange={(v) => update({ whatsapp_notifications: v })} />
          </Row>
          <Row title="Show Post-Interaction Actions" desc="Show SMS / Email / WhatsApp buttons after each call">
            <Switch checked={s.post_interaction_actions} onCheckedChange={(v) => update({ post_interaction_actions: v })} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lead Allocation & Retry</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Row title="Auto Start Allocation" desc="Automatically serve next lead to telecallers">
            <Switch checked={s.auto_start_allocation} onCheckedChange={(v) => update({ auto_start_allocation: v })} />
          </Row>
          <Row title="Variable Retry Logic" desc="Use different retry intervals for Not Connected leads">
            <Switch checked={s.variable_retry_enabled} onCheckedChange={(v) => update({ variable_retry_enabled: v })} />
          </Row>
          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Retry 1 (hours)</Label>
              <Input type="number" min={1} value={s.retry_1_hours} disabled={!s.variable_retry_enabled} onChange={(e) => update({ retry_1_hours: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Retry 2 (hours)</Label>
              <Input type="number" min={1} value={s.retry_2_hours} disabled={!s.variable_retry_enabled} onChange={(e) => update({ retry_2_hours: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Login Security</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Row title="Allow Logout on Mobile" desc="Telecallers can sign out from mobile app">
            <Switch checked={s.allow_logout_mobile} onCheckedChange={(v) => update({ allow_logout_mobile: v })} />
          </Row>
          <Row title="Allow Logout on Web" desc="Users can sign out from web dashboard">
            <Switch checked={s.allow_logout_web} onCheckedChange={(v) => update({ allow_logout_web: v })} />
          </Row>
        </CardContent>
      </Card>
    </div>
  );
};
