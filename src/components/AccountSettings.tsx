import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, User, Building2, Palette } from "lucide-react";
import { TemplatesManager } from "@/components/TemplatesManager";
import { BrandingPanel } from "@/components/admin/BrandingPanel";

type Company = {
  id: string;
  name: string;
  owner_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  pincode: string | null;
  gst_number: string | null;
  tagline: string | null;
  logo_url: string | null;
};

export const AccountSettings = () => {
  const { user, role, companyId } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: comp }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        companyId
          ? (supabase as any).from("companies").select("id,name,owner_name,contact_phone,contact_email,address,pincode,gst_number,tagline,logo_url").eq("id", companyId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setFullName(prof?.full_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setCompany((comp as any) ?? null);
      setLoading(false);
    })();
  }, [user, companyId]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    if (email && email !== user.email) {
      const { error: e2 } = await supabase.auth.updateUser({ email });
      if (e2) toast({ title: "Email update failed", description: e2.message, variant: "destructive" });
      else toast({ title: "Confirm via email link" });
    }
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

  const saveCompany = async () => {
    if (!company) return;
    setSavingCompany(true);
    const { error } = await (supabase as any).from("companies").update({
      name: company.name,
      owner_name: company.owner_name,
      contact_phone: company.contact_phone,
      contact_email: company.contact_email,
      address: company.address,
      pincode: company.pincode,
      gst_number: company.gst_number,
      tagline: company.tagline,
      logo_url: company.logo_url,
    }).eq("id", company.id);
    setSavingCompany(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Company saved" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const canShareTemplates = role === "manager" || role === "admin";
  const isAdmin = role === "admin";
  const upd = (k: keyof Company, v: string) => setCompany((c) => c ? { ...c, [k]: v } : c);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Profile, company branding & templates</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input className="h-9" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email (edit)</Label>
              <Input className="h-9" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input className="h-9" value={phone} disabled placeholder="—" />
            </div>
          </div>
          <Button variant="hero" size="sm" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input className="h-9 max-w-sm" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Minimum 6 characters" />
          <Button variant="outline" size="sm" onClick={changePassword} disabled={pwdSaving || !newPwd}>
            {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update password
          </Button>
        </CardContent>
      </Card>

      {isAdmin && company && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Company name</Label>
                <Input className="h-9" value={company.name ?? ""} onChange={(e) => upd("name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Owner name</Label>
                <Input className="h-9" value={company.owner_name ?? ""} onChange={(e) => upd("owner_name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Company contact (phone)</Label>
                <Input className="h-9" value={company.contact_phone ?? ""} onChange={(e) => upd("contact_phone", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contact email</Label>
                <Input className="h-9" value={company.contact_email ?? ""} onChange={(e) => upd("contact_email", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Address</Label>
                <Textarea rows={2} value={company.address ?? ""} onChange={(e) => upd("address", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pincode</Label>
                <Input className="h-9" value={company.pincode ?? ""} onChange={(e) => upd("pincode", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">GST number</Label>
                <Input className="h-9" value={company.gst_number ?? ""} onChange={(e) => upd("gst_number", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Tagline</Label>
                <Input className="h-9" value={company.tagline ?? ""} onChange={(e) => upd("tagline", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Upload Logo (URL)</Label>
                <Input className="h-9" value={company.logo_url ?? ""} onChange={(e) => upd("logo_url", e.target.value)} placeholder="https://…/logo.png" />
                {company.logo_url && <img src={company.logo_url} alt="logo" className="mt-2 h-12 w-12 rounded object-contain border" />}
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={saveCompany} disabled={savingCompany}>
              {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save company
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" /> Company Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandingPanel />
          </CardContent>
        </Card>
      )}

      <TemplatesManager canShare={canShareTemplates} />
    </div>
  );
};
