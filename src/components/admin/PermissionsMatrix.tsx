import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

type Perm = {
  id: string;
  role: "admin" | "manager" | "telecaller";
  track_personal_calls: boolean;
  mask_phone: boolean;
  recording_request: boolean;
  manage_ivr: boolean;
};

const COLS: { key: keyof Perm; label: string }[] = [
  { key: "track_personal_calls", label: "Track Personal Calls" },
  { key: "mask_phone", label: "Mask Customer's Phone Number" },
  { key: "recording_request", label: "Recording Request" },
  { key: "manage_ivr", label: "Manage IVR" },
];

export const PermissionsMatrix = () => {
  const [perms, setPerms] = useState<Perm[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => supabase.from("role_permissions").select("*").order("role").then(({ data }) => setPerms((data as any) ?? []));
  useEffect(() => { load(); }, []);

  const toggle = (id: string, key: keyof Perm) => setPerms((prev) => prev.map((p) => p.id === id ? { ...p, [key]: !p[key] } : p));

  const save = async () => {
    setSaving(true);
    for (const p of perms) {
      await supabase.from("role_permissions").update({
        track_personal_calls: p.track_personal_calls,
        mask_phone: p.mask_phone,
        recording_request: p.recording_request,
        manage_ivr: p.manage_ivr,
      }).eq("id", p.id);
    }
    setSaving(false);
    toast({ title: "Permissions saved" });
  };

  if (!perms.length) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Call Management Controls per role</p>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Call Management Controls</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Role</th>
                {COLS.map((c) => <th key={c.key} className="px-4 py-3 text-center font-medium">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium capitalize">{p.role}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-center">
                      <Checkbox checked={p[c.key] as boolean} onCheckedChange={() => toggle(p.id, c.key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
