import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash → SDK will pick up the session automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "Password too short", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords don't match", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Password updated ✅", description: "Ab naye password se login karo" });
    await supabase.auth.signOut();
    nav("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center"><div className="flex justify-center"><Logo /></div></div>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Apna naya password set karo</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground">Recovery link verify ho rahi hai… agar 5 sec se zyada lage, link expire ho gayi hai — phir se "Forgot password" use karo.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
