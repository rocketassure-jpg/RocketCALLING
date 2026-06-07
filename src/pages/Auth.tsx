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

const Auth = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Sales");
  const [requestedRole, setRequestedRole] = useState<"telecaller" | "manager">("telecaller");
  const [inviteCode, setInviteCode] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    nav("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Validate invite code via security-definer RPC (anon-callable)
    const { data: ok, error: rpcErr } = await supabase.rpc("validate_invite_code", { _code: inviteCode.trim() });
    if (rpcErr || !ok) {
      setLoading(false);
      return toast({ title: "Invalid invite code", description: "Apne admin se sahi invite code lein.", variant: "destructive" });
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, department, requested_role: requestedRole },
      },
    });
    setLoading(false);
    if (error) return toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    setSignedUp(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center"><Logo /></div>
          <p className="mt-3 text-sm text-muted-foreground">Staff portal — Tele-CRM access</p>
        </div>

        {signedUp ? (
          <Card className="shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <CardTitle>Account created</CardTitle>
              <CardDescription>Admin approval pending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
              <p>Aapka account ban gaya hai. Admin approve karega tab login allow hoga.</p>
              <Button variant="outline" className="w-full" onClick={() => { setSignedUp(false); }}>Back to sign in</Button>
            </CardContent>
          </Card>
        ) : (
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
                    <div className="space-y-2">
                      <Label htmlFor="ic">Invite code</Label>
                      <Input id="ic" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Admin se lein" />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">First signup automatically becomes admin.</p>
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
