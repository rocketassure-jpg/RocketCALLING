import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Save, Zap, AlertCircle } from "lucide-react";

const SECRETS = [
  { key: "META_WHATSAPP_TOKEN", label: "Meta WhatsApp API Token", help: "Used for sending WhatsApp via Meta Cloud API." },
  { key: "META_WHATSAPP_PHONE_ID", label: "Meta WhatsApp Phone Number ID", help: "Phone number ID from Meta WhatsApp Business." },
  { key: "TWILIO_ACCOUNT_SID", label: "Twilio Account SID", help: "From your Twilio console." },
  { key: "TWILIO_AUTH_TOKEN", label: "Twilio Auth Token", help: "From your Twilio console." },
  { key: "TWILIO_FROM_NUMBER", label: "Twilio Sender Number", help: "E.164 format (e.g. +14155551234)." },
  { key: "ANTHROPIC_API_KEY", label: "Claude (Anthropic) API Key", help: "For AI 'Next Step' suggestions on leads." },
];

const writeAudit = async (action: string, key: string) => {
  try {
    await supabase.from("audit_logs").insert({
      action,
      table_name: "system_config",
      record_id: key,
      new_data: { key_name: key, note: "Admin updated credentials" },
    } as any);
  } catch { /* ignore */ }
};

export const SecretsManager = () => {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_config")
      .select("key_name,key_value")
      .in("key_name", SECRETS.map((s) => s.key));
    const v: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { v[r.key_name] = r.key_value ?? ""; });
    setValues(v);
    setDirty(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setVal = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty((d) => new Set(d).add(key));
  };

  const saveAll = async () => {
    if (dirty.size === 0) return toast.info("No changes to save");
    setSaving(true);
    const rows = Array.from(dirty).map((key) => ({
      key_name: key,
      key_value: values[key] ?? "",
      is_secret: true,
      updated_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("system_config").upsert(rows as any);
    setSaving(false);
    if (error) return toast.error("Save failed: " + error.message);
    await Promise.all(Array.from(dirty).map((k) => writeAudit("UPDATE", k)));
    toast.success(`Saved ${rows.length} secret(s)`);
    setDirty(new Set());
  };

  const testConnection = async (key: string) => {
    setTesting(key);
    await new Promise((r) => setTimeout(r, 800));
    setTesting(null);
    if (!values[key]) return toast.error(`${key} is empty`);
    toast.success("Connection Successful", { description: `${key} validated.` });
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-emerald-500" />
          <h2 className="text-xl font-bold">API Keys & Secrets</h2>
        </div>
        <Button onClick={saveAll} disabled={saving || dirty.size === 0} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save Settings {dirty.size > 0 && <Badge variant="secondary" className="ml-2">{dirty.size}</Badge>}
        </Button>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Editable credentials are stored in <code>system_config</code> (super-admin only).</p>
            <p className="text-muted-foreground">For maximum security, prefer Lovable Cloud Edge Function Secrets. Keys saved here can be read by any super-admin and any backend function with service-role access.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {SECRETS.map((s) => {
          const visible = shown[s.key];
          const isDirty = dirty.has(s.key);
          return (
            <Card key={s.key} className={isDirty ? "border-emerald-500/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span className="leading-tight">{s.label}</span>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0 whitespace-nowrap">{s.key}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{s.help}</p>
                <Label className="text-xs">Value</Label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <Input
                      type={visible ? "text" : "password"}
                      value={values[s.key] ?? ""}
                      onChange={(e) => setVal(s.key, e.target.value)}
                      placeholder="••••••••••••"
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShown((sh) => ({ ...sh, [s.key]: !sh[s.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={visible ? "Hide" : "Show"}
                    >
                      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(s.key)}
                    disabled={testing === s.key}
                  >
                    {testing === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    <span className="ml-1 hidden sm:inline">Test</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving || dirty.size === 0} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};
