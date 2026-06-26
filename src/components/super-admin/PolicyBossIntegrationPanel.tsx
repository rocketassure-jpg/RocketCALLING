import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug, RefreshCw, Send, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePolicybossSession } from "@/hooks/usePolicybossSession";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PolicyBossIntegrationPanel = () => {
  const pb = usePolicybossSession();
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const sendOtp = async () => {
    const u = username.trim() || pb.username || "";
    if (!u) return toast({ title: "Username required", variant: "destructive" });
    setBusy(true);
    try {
      const res: any = await pb.sendOtp(u);
      setOtpSent(true);
      toast({ title: res?.message || "OTP sent" });
    } catch (e: any) {
      toast({ title: "Could not send OTP", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return toast({ title: "Enter OTP", variant: "destructive" });
    setBusy(true);
    try {
      const res: any = await pb.verifyOtp(otp.trim(), username.trim() || undefined);
      toast({ title: res?.message || "PolicyBoss connected" });
      setOtp(""); setOtpSent(false);
    } catch (e: any) {
      toast({ title: "Verify failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
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
    try { await pb.refresh(); toast({ title: "Token refreshed" }); }
    catch (e: any) { toast({ title: "Refresh failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
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
          {pb.loginMode && (
            <Badge variant="outline" className="ml-1 uppercase text-[10px]">
              {pb.loginMode === "otp" ? "OTP" : "Password"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upstream provider for the Quotation Module (vehicle lookup, motor quotes, KYC, payment links).
          Telecallers never see PolicyBoss branding. Login once with OTP — token is reused for all quotes.
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

        <Tabs defaultValue="otp" className="w-full">
          <TabsList>
            <TabsTrigger value="otp"><ShieldCheck className="h-4 w-4 mr-1" /> Username + OTP</TabsTrigger>
            <TabsTrigger value="password"><KeyRound className="h-4 w-4 mr-1" /> Password</TabsTrigger>
          </TabsList>

          <TabsContent value="otp" className="space-y-3 pt-3">
            <div>
              <Label>PolicyBoss Username (email / mobile)</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={pb.username ?? "posp@partner.com or 9876543210"}
                disabled={otpSent}
              />
            </div>

            {!otpSent ? (
              <Button onClick={sendOtp} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send OTP
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Enter OTP</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit OTP"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={verifyOtp} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Verify & Save
                  </Button>
                  <Button variant="ghost" onClick={() => { setOtpSent(false); setOtp(""); }} disabled={busy}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={sendOtp} disabled={busy}>
                    Resend OTP
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="password" className="space-y-3 pt-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="posp@partner.com" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <Button onClick={savePassword} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Save & Connect
            </Button>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-3">
          <Button variant="outline" onClick={refresh} disabled={busy || !pb.username}>
            <RefreshCw className="h-4 w-4" /> Refresh Token
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyBossIntegrationPanel;
