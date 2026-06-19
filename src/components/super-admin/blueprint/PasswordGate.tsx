import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmed: () => void | Promise<void>;
  actionLabel: string;
};

export const PasswordGate = ({ open, onOpenChange, onConfirmed, actionLabel }: Props) => {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!pwd) return toast({ title: "Password required", variant: "destructive" });
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setBusy(false); return toast({ title: "Not signed in", variant: "destructive" }); }
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: pwd });
    setBusy(false);
    if (error) return toast({ title: "Invalid password", variant: "destructive" });
    setPwd("");
    onOpenChange(false);
    await onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Re-enter password</DialogTitle>
          <DialogDescription>
            This export contains sensitive customer/lead data (PII). Confirm your password to continue: <b>{actionLabel}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirm()} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Export"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
