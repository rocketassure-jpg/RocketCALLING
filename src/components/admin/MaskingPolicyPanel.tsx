import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Save, Loader2 } from "lucide-react";
import { useSettings, MaskingConfig, RoleKey } from "@/contexts/SettingsContext";

const ROLES: { key: RoleKey; label: string; locked?: boolean }[] = [
  { key: "admin",      label: "Company Admin (always full)", locked: true },
  { key: "manager",    label: "Manager" },
  { key: "telecaller", label: "Telecaller" },
  { key: "agent",      label: "Agent" },
  { key: "sub_agent",  label: "Sub-Agent (limited access)" },
];

export const MaskingPolicyPanel = () => {
  const { masking, saveMasking } = useSettings();
  const [draft, setDraft] = useState<MaskingConfig>(masking);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(masking); }, [masking]);

  const update = (role: RoleKey, key: "masked" | "reveal_on_dial", value: boolean) => {
    setDraft((d) => ({ ...d, [role]: { ...d[role], [key]: value } }));
  };

  const save = async () => {
    setSaving(true);
    // force admin = full visibility
    const fixed: MaskingConfig = { ...draft, admin: { masked: false, reveal_on_dial: false } };
    await saveMasking(fixed);
    setSaving(false);
    toast({ title: "Privacy settings saved" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Phone Number Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Masked = sirf last 4 digits dikhenge (XXXXXX 7946). "Reveal on dial" → masked dikhega lekin Dial press karne par 1 sec ke liye full number flash hoga.
        </p>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-center">Mask number</th>
                <th className="p-3 text-center">Reveal on Dial</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const v = draft[r.key] ?? { masked: false, reveal_on_dial: false };
                return (
                  <tr key={r.key} className="border-t">
                    <td className="p-3 font-medium">{r.label}</td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={r.locked ? false : v.masked}
                        disabled={r.locked}
                        onCheckedChange={(val) => update(r.key, "masked", val)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={r.locked ? false : v.reveal_on_dial}
                        disabled={r.locked || !v.masked}
                        onCheckedChange={(val) => update(r.key, "reveal_on_dial", val)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save privacy settings
        </Button>
      </CardContent>
    </Card>
  );
};
