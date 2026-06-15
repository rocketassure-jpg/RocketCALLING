import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, KeyRound, Webhook, MessageSquare, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ApiKey = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked: boolean };

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const WEBHOOK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const generateKey = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const b64 = btoa(String.fromCharCode(...arr)).replace(/[^a-zA-Z0-9]/g, "");
  return `rkt_${b64.slice(0, 32)}`;
};

export const ApiKeysManager = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  // WhatsApp Bridge config (per-company)
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [bridgeApiKey, setBridgeApiKey] = useState("");
  const [bridgeSaving, setBridgeSaving] = useState(false);
  const [bridgeCompanyId, setBridgeCompanyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    setKeys((data ?? []) as ApiKey[]);
  };

  const loadBridge = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    const cid = prof?.company_id ?? null;
    setBridgeCompanyId(cid);
    if (!cid) return;
    const { data: cfg } = await supabase
      .from("whatsapp_bridge_settings")
      .select("bridge_url, bridge_api_key")
      .eq("company_id", cid)
      .maybeSingle();
    setBridgeUrl(cfg?.bridge_url ?? "");
    setBridgeApiKey(cfg?.bridge_api_key ?? "");
  };

  useEffect(() => { load(); loadBridge(); }, []);

  const saveBridge = async () => {
    if (!bridgeCompanyId) return toast({ title: "No company context", variant: "destructive" });
    setBridgeSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("whatsapp_bridge_settings")
      .upsert({
        company_id: bridgeCompanyId,
        bridge_url: bridgeUrl.trim() || null,
        bridge_api_key: bridgeApiKey.trim() || null,
        updated_by: user?.id ?? null,
      }, { onConflict: "company_id" });
    setBridgeSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "WhatsApp Bridge saved" });
  };

  const create = async () => {
    if (!name.trim()) return toast({ title: "Enter a name", variant: "destructive" });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const raw = generateKey();
    const hash = await sha256Hex(raw);
    const { error } = await supabase.from("api_keys").insert({ name: name.trim(), key_hash: hash, prefix: raw.slice(0, 8), created_by: user.id });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewKey(raw);
    setName("");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /> WhatsApp / Lead Webhook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label>Webhook URL (for Wati / Interakt / Meta / Facebook Ads)</Label>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(WEBHOOK_URL)}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            POST JSON to this URL with header <code className="rounded bg-muted px-1">x-api-key: YOUR_API_KEY</code>.
            Accepted fields: <code>customer_name</code>, <code>phone_number</code>, <code>policy_type</code>, <code>message</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> WhatsApp Bridge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Self-hosted WhatsApp bridge endpoint used for QR pairing and outbound send. Stored per-company; only admins can see/change.
          </p>
          <div className="space-y-2">
            <Label>Bridge URL</Label>
            <Input
              placeholder="https://your-bridge.example.com"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>Bridge API Key</Label>
            <Input
              type="password"
              placeholder="x-api-key value sent to the bridge"
              value={bridgeApiKey}
              onChange={(e) => setBridgeApiKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={saveBridge} disabled={bridgeSaving || !bridgeCompanyId}>
            <Save className="h-4 w-4 mr-1" /> {bridgeSaving ? "Saving…" : "Save Bridge Config"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> API Keys</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Key name (e.g. Wati Production)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Generate</Button>
          </div>

          {newKey && (
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
              <div className="text-sm font-semibold">Your new API key (shown once):</div>
              <div className="flex gap-2">
                <Input readOnly value={newKey} className="font-mono text-xs" />
                <Button variant="outline" onClick={() => copy(newKey)}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>I've saved it</Button>
            </div>
          )}

          <div className="space-y-2">
            {keys.length === 0 && <p className="text-sm text-muted-foreground">No API keys yet.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{k.name} <Badge variant={k.revoked ? "destructive" : "secondary"} className="ml-2">{k.revoked ? "Revoked" : "Active"}</Badge></div>
                  <div className="text-xs text-muted-foreground font-mono">{k.prefix}••••••••</div>
                  <div className="text-xs text-muted-foreground">Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</div>
                </div>
                {!k.revoked && <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
