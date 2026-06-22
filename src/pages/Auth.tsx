import { useEffect, useState } from "react";
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

const slugifyCode = (name: string, mobile: string) => {
  const base = (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const tail = (mobile || "").replace(/\D/g, "").slice(-4);
  return (base + tail).slice(0, 12);
};

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [department, setDepartment] = useState("Sales");
  const [requestedRole, setRequestedRole] = useState<"telecaller" | "manager">("telecaller");
  const [signupMode, setSignupMode] = useState<SignupMode>("create");
  const [companyCode, setCompanyCode] = useState("");
  const [companyCodeEdited, setCompanyCodeEdited] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyPreview, setCompanyPreview] = useState<{ name: string } | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);

  useEffect(() => {
    (supabase as any).rpc("invite_code_required").then(({ data }: any) => {
      if (data === true) setInviteRequired(true);
    });
  }, []);

  useEffect(() => {
    if (signupMode === "create" && !companyCodeEdited) {
      setCompanyCode(slugifyCode(companyName, mobile));
    }
  }, [companyName, mobile, signupMode, companyCodeEdited]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let loginEmail = email.trim();
    if (loginEmail && !loginEmail.includes("@")) {
      const { data } = await (supabase as any).rpc("resolve_login_email", { _login: loginEmail });
      if (!data) {
        setLoading(false);
        return toast({ title: "Account not found", description: "Yeh mobile/email registered nahi hai", variant: "destructive" });
      }
      loginEmail = data as string;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    nav("/dashboard");
  };

  const handleForgot = async () => {
    let target = email.trim();
    if (!target) return toast({ title: "Email/Mobile daalo", description: "Pehle field bharo, fir 'Forgot password' click karo", variant: "destructive" });
    if (!target.includes("@")) {
      const { data } = await (supabase as any).rpc("resolve_login_email", { _login: target });
      if (!data) return toast({ title: "Account not found", variant: "destructive" });
      target = data as string;
    }
    // Synthetic staff emails can't receive mail — guide them to admin
    if (target.endsWith(".staff.local")) {
      return toast({
        title: "Admin se reset karwao",
        description: "Tumhara account email-less hai. Admin ko bolo Settings → Team se 'Reset to default password' kare.",
        variant: "destructive",
      });
    }
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Reset link bhej diya 📧", description: `Check ${target}` });
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
    if (signupMode === "create" && !email.trim()) return toast({ title: "Email zaruri hai", description: "Company admin ke liye email chahiye", variant: "destructive" });
    if (signupMode === "join" && !mobile.trim()) return toast({ title: "Mobile number daalo", description: "Employee signup ke liye mobile zaruri hai", variant: "destructive" });

    if (inviteRequired && signupMode === "join") {
      if (!inviteCode.trim()) return toast({ title: "Invite code required", description: "Admin se invite code lo", variant: "destructive" });
      const { data: valid } = await (supabase as any).rpc("validate_invite_code", { _code: inviteCode.trim() });
      if (!valid) return toast({ title: "Invalid invite code", variant: "destructive" });
    }

    setLoading(true);
    const meta: Record<string, any> = { full_name: fullName, department, requested_role: requestedRole, mobile };
    let signupEmail = email.trim();
    if (signupMode === "join") {
      meta.company_code = companyCode;
      if (!signupEmail) {
        const digits = mobile.replace(/\D/g, "");
        const codeSlug = (companyCode || "staff").toLowerCase().replace(/[^a-z0-9]/g, "");
        signupEmail = `${digits}@${codeSlug}.staff.local`;
      }
    } else {
      meta.create_company = "true";
      meta.company_name = companyName.trim();
      if (companyCode.trim().length >= 3) meta.company_code = companyCode.trim().toUpperCase();
    }
    const { error } = await supabase.auth.signUp({
      email: signupEmail, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    if (error) {
      setLoading(false);
      return toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    }
    await supabase.auth.signInWithPassword({ email: signupEmail, password }).catch(() => {});
    setLoading(false);
    toast({ title: "Account created", description: "Welcome!" });
    if (signupMode === "create") nav("/admin?tab=training&onboarding=1");
    else nav("/dashboard");
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
                      <Label htmlFor="se">Email or Mobile</Label>
                      <Input id="se" type="text" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com ya 10-digit mobile" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp">Password</Label>
                      <Input id="sp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
                    </Button>
                    <button type="button" onClick={handleForgot} className="block w-full text-center text-xs text-primary hover:underline">
                      Forgot password?
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    {/* Mode toggle on top */}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSignupMode("create")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${signupMode === "create" ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>Create New Company</button>
                      <button type="button" onClick={() => setSignupMode("join")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${signupMode === "join" ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>Join Company</button>
                    </div>

                    {signupMode === "create" && (
                      <div className="space-y-2">
                        <Label htmlFor="cn">Company Name *</Label>
                        <Input id="cn" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. XYZ Insurance Broker" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="n">Full Name *</Label>
                      <Input id="n" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ue">Email {signupMode === "create" ? "*" : <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                      <Input id="ue" type="email" required={signupMode === "create"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={signupMode === "join" ? "Optional — mobile se login ho jayega" : ""} />
                      {signupMode === "join" && <p className="text-[11px] text-muted-foreground">Employees mobile + password se login karenge. Email zaruri nahi.</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="up">Password *</Label>
                      <Input id="up" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mob">Mobile {signupMode === "create" ? "*" : ""}</Label>
                      <Input id="mob" type="tel" inputMode="numeric" required={signupMode === "create"} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" />
                    </div>

                    {signupMode === "create" ? (
                      <div className="space-y-2">
                        <Label htmlFor="cc">Company Code (auto, editable)</Label>
                        <Input id="cc" value={companyCode} onChange={(e) => { setCompanyCodeEdited(true); setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); }} placeholder="Auto from name + mobile" />
                        <p className="text-xs text-muted-foreground">Default = Company name + last 4 of mobile. Edit allowed.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="jc">Company Code *</Label>
                        <Input id="jc" value={companyCode} onChange={(e) => { const v = e.target.value.toUpperCase(); setCompanyCode(v); verifyCode(v); }} placeholder="e.g. ROCKET" />
                        {codeChecking && <p className="text-xs text-muted-foreground">Checking…</p>}
                        {companyPreview && <p className="text-xs text-success">✓ Joining <strong>{companyPreview.name}</strong></p>}
                        {!codeChecking && !companyPreview && companyCode.length >= 3 && <p className="text-xs text-destructive">Code not found</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={requestedRole} onValueChange={(v) => setRequestedRole(v as any)} disabled={signupMode === "create"}>
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

                    {inviteRequired && signupMode === "join" && (
                      <div className="space-y-1.5">
                        <Label>Invite Code *</Label>
                        <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Admin se invite code lo" />
                      </div>
                    )}

                    <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} {signupMode === "create" ? "Create Company & Admin Account" : "Create account"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">{signupMode === "create" ? "Naya account turant active hoga — tum admin ho. Signup ke baad training page khulega." : "Staff signup — admin approval ke baad access milega."}</p>
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
