import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePolicybossSession } from "@/hooks/usePolicybossSession";

export const PolicyBossIntegrationPanel = () => {
  const pb = usePolicybossSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!username.trim() || !password.trim()) {
      return toast({ title: "Username and password required", variant: "destructive" });
    }
    setBusy(true);
    try {
      await pb.connect(username.trim(), password);
      toast({ title: "PolicyBoss connected" });
      setPassword("");
    } catch (e: any) {
      toast({ title: "Connect failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      await pb.refresh();
      toast({ title: "Token refreshed" });
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" /> PolicyBoss POSP Integration
          {pb.loading ? null : pb.connected ? (
            <Badge className="bg-success text-success-foreground">Connected</Badge>
          ) : (
            <Badge variant="destructive">Disconnected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Used as the upstream provider for the Quotation Module (vehicle lookup, motor quotes, KYC, payment links).
          Telecallers never see PolicyBoss branding — they only use the Quotation Module.
        </p>

        {pb.username && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div><span className="text-muted-foreground">Account:</span> {pb.username}</div>
            <div>
              <span className="text-muted-foreground">Token expires:</span>{" "}
              {pb.expiresAt ? new Date(pb.expiresAt).toLocaleString() : "—"}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Username (email)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="posp@partner.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Save & Connect
          </Button>
          <Button variant="outline" onClick={refresh} disabled={busy || !pb.username}>
            <RefreshCw className="h-4 w-4" /> Refresh Token
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyBossIntegrationPanel;
