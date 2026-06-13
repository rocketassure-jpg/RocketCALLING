import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Check, X, Loader2, UserCheck, Copy, RefreshCw } from "lucide-react";

type Pending = {
  id: string;
  full_name: string;
  department: string | null;
  requested_role: string | null;
  created_at: string;
};

export const PendingApprovalsPanel = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Pending | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveRole, setApproveRole] = useState<Record<string, "telecaller" | "manager" | "admin">>({});
  const [inviteCode, setInviteCode] = useState<string>("");
  const [savingCode, setSavingCode] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id,full_name,department,requested_role,created_at,is_approved,is_active")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });
    setPending((data ?? []) as Pending[]);
    const { data: code } = await (supabase as any).rpc("get_invite_code");
    setInviteCode(code ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (p: Pending) => {
    if (!user) return;
    setBusyId(p.id);
    const role = approveRole[p.id] || (p.requested_role as any) || "telecaller";
    const { error: rErr } = await supabase.from("user_roles").insert({ user_id: p.id, role });
    if (rErr && !rErr.message.includes("duplicate")) {
      setBusyId(null);
      return toast({ title: "Approve failed", description: rErr.message, variant: "destructive" });
    }
    const { error } = await (supabase as any).from("profiles").update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    }).eq("id", p.id);
    setBusyId(null);
    if (error) return toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    toast({ title: "User approved", description: `${p.full_name} → ${role}` });
    load();
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    const { error } = await (supabase as any).from("profiles").update({
      is_active: false,
      rejection_reason: rejectReason || "Rejected by admin",
    }).eq("id", rejecting.id);
    setBusyId(null);
    setRejecting(null);
    setRejectReason("");
    if (error) return toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    toast({ title: "User rejected" });
    load();
  };

  const saveCode = async () => {
    setSavingCode(true);
    const { data: existing } = await (supabase as any).from("app_settings").select("id").maybeSingle();
    const payload = { invite_code: inviteCode.trim() };
    const { error } = existing
      ? await (supabase as any).from("app_settings").update(payload).eq("id", existing.id)
      : await (supabase as any).from("app_settings").insert(payload);
    setSavingCode(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Invite code updated" });
  };

  const copyCode = () => { navigator.clipboard.writeText(inviteCode); toast({ title: "Copied" }); };
  const randomize = () => setInviteCode("RCK" + Math.random().toString(36).slice(2, 8).toUpperCase());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Signup invite code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Code (share with new staff)</Label>
            <div className="flex gap-2">
              <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="ROCKET2026" />
              <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copy"><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={randomize} aria-label="Randomize"><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
          <Button variant="hero" onClick={saveCode} disabled={savingCode || !inviteCode.trim()} className="min-h-[44px]">
            {savingCode && <Loader2 className="h-4 w-4 animate-spin" />} Save code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" /> Pending approvals
            {pending.length > 0 && <Badge variant="destructive">{pending.length}</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Koi pending request nahi hai.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.full_name || "(no name)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.department || "—"} · requested {p.requested_role || "telecaller"}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <Label className="text-xs">Assign role</Label>
                    <Select
                      value={approveRole[p.id] || (p.requested_role as any) || "telecaller"}
                      onValueChange={(v) => setApproveRole((r) => ({ ...r, [p.id]: v as any }))}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="telecaller">Telecaller</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" className="min-h-[40px] flex-1" onClick={() => approve(p)} disabled={busyId === p.id}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="min-h-[40px] flex-1" onClick={() => { setRejecting(p); setRejectReason(""); }} disabled={busyId === p.id}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="bg-background">
          <DialogHeader><DialogTitle>Reject {rejecting?.full_name}?</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason (shown to user)</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Not authorized" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!!busyId}>
              {busyId && <Loader2 className="h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
