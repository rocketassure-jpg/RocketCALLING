import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Loader2, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const sanitizeName = (raw: string) =>
  raw
    .replace(/[^\p{L}\p{N}\s.'-]/gu, "") // strip emoji/special chars (the "block" chars)
    .replace(/^\s+/, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 80);

type Role = "admin" | "manager" | "telecaller" | "sub_agent";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  telecaller: "Telecaller",
  sub_agent: "Sub-Agent",
};

export const EditMemberDialog = ({
  open, onOpenChange, member, branches, currentRole, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: { id: string; full_name?: string | null; branch_id?: string | null; manager_id?: string | null } | null;
  branches: { id: string; name: string }[];
  currentRole: Role;
  onSaved: () => void;
}) => {
  const [name, setName] = useState(member?.full_name ?? "");
  const [branchId, setBranchId] = useState<string>(member?.branch_id ?? "none");
  const [role, setRole] = useState<Role>(currentRole);
  const [saving, setSaving] = useState(false);

  // reset when member changes
  if (member && open && name === "" && member.full_name) {
    setName(member.full_name);
    setBranchId(member.branch_id ?? "none");
    setRole(currentRole);
  }

  const save = async () => {
    if (!member) return;
    setSaving(true);
    const cleanName = sanitizeName(name).trim();
    // Update profile (name + branch)
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: cleanName || null, branch_id: branchId === "none" ? null : branchId })
      .eq("id", member.id);
    if (pErr) { setSaving(false); return toast({ title: "Update failed", description: pErr.message, variant: "destructive" }); }

    // Update role if changed
    if (role !== currentRole) {
      await supabase.from("user_roles").delete().eq("user_id", member.id).eq("role", currentRole as any);
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: member.id, role: role as any });
      if (rErr) { setSaving(false); return toast({ title: "Role change failed", description: rErr.message, variant: "destructive" }); }
    }
    setSaving(false);
    toast({ title: "Saved" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Edit3 className="h-4 w-4" /> Edit Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(sanitizeName(e.target.value))} placeholder="Type name (no special chars)" />
            <p className="text-[10px] text-muted-foreground">Block characters / emoji automatically remove ho jate hain.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Designation</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={save} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
