import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Loader2, Upload } from "lucide-react";

const KEYS = ["APP_NAME", "APP_LOGO_URL", "BRAND_COLOR", "APP_VERSION"] as const;
const DEFAULTS: Record<string, string> = {
  APP_NAME: "Rocket CRM",
  APP_LOGO_URL: "",
  BRAND_COLOR: "#e85d24",
  APP_VERSION: "1.0.0",
};

export const AppConfigPanel = () => {
  const [vals, setVals] = useState<Record<string, string>>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_config").select("key_name,key_value").in("key_name", KEYS as any);
    const next = { ...DEFAULTS };
    (data ?? []).forEach((r: any) => { next[r.key_name] = r.key_value ?? ""; });
    setVals(next);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const rows = KEYS.map(k => ({ key_name: k, key_value: vals[k], is_secret: false, updated_by: user?.id }));
    const { error } = await supabase.from("system_config").upsert(rows as any, { onConflict: "key_name" });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "App config saved" });
  };

  const bumpVersion = () => {
    const parts = (vals.APP_VERSION || "1.0.0").split(".").map(Number);
    parts[0] = (parts[0] || 1) + 1; parts[1] = 0; parts[2] = 0;
    setVals({ ...vals, APP_VERSION: parts.join(".") });
  };

  if (loading) return <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> App Config</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>App Name</Label>
            <Input value={vals.APP_NAME} onChange={(e) => setVals({ ...vals, APP_NAME: e.target.value })} />
          </div>
          <div>
            <Label>Version (bump on major release)</Label>
            <div className="flex gap-2">
              <Input value={vals.APP_VERSION} onChange={(e) => setVals({ ...vals, APP_VERSION: e.target.value })} />
              <Button variant="outline" type="button" onClick={bumpVersion}>+ Major</Button>
            </div>
          </div>
          <div>
            <Label>Logo URL</Label>
            <div className="flex gap-2">
              <Input value={vals.APP_LOGO_URL} onChange={(e) => setVals({ ...vals, APP_LOGO_URL: e.target.value })} placeholder="https://..." />
              <Button variant="outline" type="button" disabled><Upload className="h-4 w-4" /></Button>
            </div>
            {vals.APP_LOGO_URL && <img src={vals.APP_LOGO_URL} alt="logo" className="mt-2 h-12 rounded border bg-muted p-1" />}
          </div>
          <div>
            <Label>Brand Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" className="w-16 h-10 p-1" value={vals.BRAND_COLOR} onChange={(e) => setVals({ ...vals, BRAND_COLOR: e.target.value })} />
              <Input value={vals.BRAND_COLOR} onChange={(e) => setVals({ ...vals, BRAND_COLOR: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </div>
      </CardContent>
    </Card>
  );
};
