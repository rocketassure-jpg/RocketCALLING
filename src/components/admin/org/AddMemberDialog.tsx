import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sanitizeName } from "@/components/admin/EditMemberDialog";

type Role = "manager" | "telecaller" | "sub_agent";
type Branch = { id: string; name: string };
type Designation = { key: string; label: string; is_active: boolean };

export const defaultPasswordFor = (name: string, mobile: string) => {
  const letters = (name || "").replace(/[^A-Za-z]/g, "");
  const head = (letters.slice(0, 4) || "user").padEnd(4, "x");
  const cap = head.charAt(0).toUpperCase() + head.slice(1).toLowerCase();
  const digits = (mobile || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `${cap}${digits}`;
};

export const AddMemberDialog = ({
  open, onOpenChange, branches, designations, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branches: Branch[];
  designations: Designation[];
  onCreated: () => void;
}) => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("telecaller");
  const [designation, setDesignation] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const preview = defaultPasswordFor(name, mobile);

  const reset = () => {
    setName(""); setMobile(""); setEmail(""); setRole("telecaller");
    setDesignation(""); setBranchId("none"); setResult(null);
  };

  const submit = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 10) return toast({ title: "10-digit mobile required", variant: "destructive" });
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("team-admin", {
      body: {
        action: "add_member",
        full_name: name.trim(),
        mobile: digits,
        email: email.trim() || null,
        role,
        designation: designation || null,
        branch_id: branchId === "none" ? null : branchId,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      return toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    }
    setResult({ email: (data as any).email, password: (data as any).password });
    toast({ title: "Member added ✅" });
    onCreated();
  };

  const copy = async (txt: string) => { try { await navigator.clipboard.writeText(txt); toast({ title: "Copied" }); } catch {} };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Team Member</DialogTitle>
          <DialogDescription className="text-xs">
            Default password = First 4 letters of name + last 4 digits of mobile.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-md border border-success/40 bg-success/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-success font-medium"><CheckCircle2 className="h-4 w-4" /> Account created</div>
              <p className="mt-2 text-xs text-muted-foreground">Share these login details with the member:</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="font-mono">{result.email}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(result.email)}><Copy className="h-3 w-3" /></Button>
                </div>
                <div className="flex items-center justify-between gap-2"><span className="font-mono">{result.password}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(result.password)}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>Add Another</Button>
              <Button variant="hero" onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input value={name} onChange={(e) => setName(sanitizeName(e.target.value))} placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mobile *</Label>
                  <Input inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digits" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telecaller">Telecaller</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="sub_agent">Sub-Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Blank rahega to mobile@company.staff.local banega" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Designation</Label>
                  <Select value={designation || "none"} onValueChange={(v) => setDesignation(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {designations.filter(d => d.is_active).map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Branch</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                Default password preview: <span className="font-mono font-semibold">{preview}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="hero" onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Member"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
