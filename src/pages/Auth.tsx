import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

type SignupMode = "join" | "create";

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Sales");
  const [requestedRole, setRequestedRole] = useState<"telecaller" | "manager">("telecaller");
  const [signupMode, setSignupMode] = useState<SignupMode>("join");
  const [companyCode, setCompanyCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPreview, setCompanyPreview] = useState<{ name: string } | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    nav("/dashboard");
  };

  const verifyCode = async (code: string) => {
    setCompanyPreview(null);
    if (!code || code.length < 3) return;
    setCodeChecking(true);
    const { data } = await (supabase as any).rpc("lookup_company_by_code", { _code: code });
    setCodeChecking(false);
    if (data && data.length) setCompanyPreview({ name: data[0].name });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupMode === "join" && !companyPreview) return toast({ title: "Valid Company Code daalo", description: "Apni company ka code admin se lo", variant: "destructive" });
    if (signupMode === "create" && !companyName.trim()) return toast({ title: "Company ka naam daalo", variant: "destructive" });
    setLoading(true);
    const meta: Record<string, any> = { full_name: fullName, department, requested_role: requestedRole };
    if (signupMode === "join") meta.company_code = companyCode;
    else { meta.create_company = "true"; meta.company_name = companyName.trim(); }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    if (error) {
      setLoading(false);
      return toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    }
    await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
    setLoading(false);
    toast({ title: "Account created", description: "Welcome!" });
    nav("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center"><Logo /></div>
          <p className="mt-3 text-sm text-muted-foreground">Staff portal — Tele-CRM access</p>
        </div>

        {false ? null : (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to manage your assigned leads</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="se">Email</Label>
                      <Input id="se" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp">Password</Label>
                      <Input id="sp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="n">Full name</Label>
                      <Input id="n" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ue">Email</Label>
                      <Input id="ue" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="up">Password</Label>
                      <Input id="up" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={requestedRole} onValueChange={(v) => setRequestedRole(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="telecaller">Telecaller</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={department} onValueChange={setDepartment}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Renewals">Renewals</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Company selection */}
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSignupMode("join")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${signupMode === "join" ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>Join Company</button>
                        <button type="button" onClick={() => setSignupMode("create")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${signupMode === "create" ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>Create New Company</button>
                      </div>
                      {signupMode === "join" ? (
                        <div className="space-y-1.5">
                          <Label>Company Code</Label>
                          <Input value={companyCode} onChange={(e) => { const v = e.target.value.toUpperCase(); setCompanyCode(v); verifyCode(v); }} placeholder="e.g. ROCKET" />
                          {codeChecking && <p className="text-xs text-muted-foreground">Checking…</p>}
                          {companyPreview && <p className="text-xs text-success">✓ Joining <strong>{companyPreview.name}</strong></p>}
                          {!codeChecking && !companyPreview && companyCode.length >= 3 && <p className="text-xs text-destructive">Code not found</p>}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label>Company Name</Label>
                          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. XYZ Insurance Broker" />
                          <p className="text-xs text-muted-foreground">Tum is company ke admin banoge. Code automatic generate hoga.</p>
                        </div>
                      )}
                    </div>

                    <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">First signup automatically becomes super admin.</p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
