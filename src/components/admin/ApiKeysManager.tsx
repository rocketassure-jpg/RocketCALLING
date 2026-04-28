import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, KeyRound, Webhook } from "lucide-react";
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

  const load = async () => {
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    setKeys((data ?? []) as ApiKey[]);
  };
  useEffect(() => { load(); }, []);

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
