import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { QuoteDraft } from "../MotorQuoteWizard";

const inr = (n?: number | null) => `₹${Math.round(n ?? 0).toLocaleString("en-IN")}`;

export const PaymentStep = ({
  draft, setDraft, onClose,
}: {
  draft: QuoteDraft;
  setDraft: (d: Partial<QuoteDraft>) => void;
  onClose: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(!!draft.payment_sent_at);
  const [markOpen, setMarkOpen] = useState(false);
  const [reference, setReference] = useState("");

  const sendLink = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-payment-link", {
        body: { motor_quote_id: draft.id },
      });
      if (error) throw error;
      const url = data?.payment_url as string;
      const msg = `Namaste ${draft.customer_name ?? "ji"}! 🙏

Aapki ${draft.registration_number} (${draft.make ?? ""} ${draft.model ?? ""}) ke liye ${draft.insurer_name} insurance ka payment link ready hai:

💰 Total Amount: ${inr(draft.gross_premium ?? draft.net_premium)}

👉 Payment karein: ${url}

⏰ Link valid: 24 ghante
✅ Payment ke baad policy aapki email pe aayegi.`;
      const wa = `https://wa.me/${(draft.phone_number ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(wa, "_blank", "noopener,noreferrer");
      setDraft({ payment_link: url, payment_sent_at: new Date().toISOString(), status: "payment_sent" });
      setSent(true);
    } catch (e: any) {
      toast({ title: "Payment link failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await supabase.from("motor_quotes").update({
        status: "converted", payment_reference: reference || null,
      }).eq("id", draft.id);
      if (draft.lead_id) await supabase.from("leads").update({ status: "Converted" }).eq("id", draft.lead_id);
      toast({ title: "Marked as paid — converted" });
      setMarkOpen(false);
      onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const gross = draft.gross_premium ?? Math.round((draft.net_premium ?? 0) * 1.18);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 pt-4 text-sm">
          <div><span className="text-muted-foreground">Gaadi:</span> {draft.registration_number} — {draft.make} {draft.model}</div>
          <div><span className="text-muted-foreground">Insurer:</span> {draft.insurer_name} | {draft.plan_type}</div>
          <div><span className="text-muted-foreground">IDV:</span> {inr(draft.idv)}</div>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="space-y-2 pt-4 text-sm">
          <div className="text-xs font-semibold text-muted-foreground">Customer ko kitna pay karna hai</div>
          <div className="grid grid-cols-2 gap-y-1">
            <div className="text-muted-foreground">OD Premium</div><div className="text-right font-mono">{inr(draft.od_premium)}</div>
            <div className="text-muted-foreground">TP Premium</div><div className="text-right font-mono">{inr(draft.tp_premium)}</div>
            <div className="text-muted-foreground">Add-ons</div><div className="text-right font-mono">{inr(draft.addon_premium)}</div>
            <div className="text-muted-foreground">GST (18%)</div><div className="text-right font-mono">{inr(draft.gst_amount)}</div>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">TOTAL</span>
            <span className="text-2xl font-bold text-success">{inr(gross)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg" className="w-full"
        onClick={sendLink}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {sent ? "✓ Payment Link Bhej Diya — Send again" : "💳 Payment Link WhatsApp pe Bhejo"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Payment link automatically generate hogi aur customer ko WhatsApp pe jaayegi.
      </p>

      {sent && (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
          ✓ Payment link bhej diya gaya!
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setMarkOpen(true)} disabled={!sent}>
          <CheckCircle2 className="h-4 w-4" /> Mark as Paid
        </Button>
      </div>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm payment received</DialogTitle></DialogHeader>
          <Label>Transaction / Reference ID</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN12345" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button>
            <Button onClick={markPaid} disabled={busy}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
