import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, User } from "lucide-react";
import { TemplatesManager } from "@/components/TemplatesManager";

export const AccountSettings = () => {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setFullName(data?.full_name ?? ""); setLoading(false); });
    setPhone(user.phone ?? "");
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Profile updated" });
  };

  const changePassword = async () => {
    if (newPwd.length < 6) return toast({ title: "Password min 6 chars", variant: "destructive" });
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewPwd("");
    toast({ title: "Password updated" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const canShareTemplates = role === "manager" || role === "admin";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Apna profile aur templates manage karein</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} disabled placeholder="—" />
          </div>
          <Button variant="hero" onClick={saveProfile} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
          <Button variant="outline" onClick={changePassword} disabled={pwdSaving || !newPwd} className="min-h-[44px]">
            {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update password
          </Button>
        </CardContent>
      </Card>

      <TemplatesManager canShare={canShareTemplates} />
    </div>
  );
};
