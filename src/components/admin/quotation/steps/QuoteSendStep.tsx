import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { QuoteDraft } from "../MotorQuoteWizard";

const inr = (n?: number | null) => `₹${Math.round(n ?? 0).toLocaleString("en-IN")}`;

export const QuoteSendStep = ({
  draft, setDraft, onNext, onBack,
}: {
  draft: QuoteDraft;
  setDraft: (d: Partial<QuoteDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const [sent, setSent] = useState(!!draft.whatsapp_sent_at);

  const defaultMsg = useMemo(() => `Namaste ${draft.customer_name ?? "ji"}! 🚗

Aapki gaadi ${draft.registration_number} ke liye insurance quote ready hai:

🏢 Insurer: ${draft.insurer_name}
📋 Plan: ${draft.plan_type}
💰 IDV: ${inr(draft.idv)}
✅ Net Premium: ${inr(draft.net_premium)}

Add-ons: ${(draft.selected_addons ?? []).join(", ") || "None"}

Quote valid 24 ghante tak. Payment ke liye reply karein.`, [draft]);

  const [message, setMessage] = useState(defaultMsg);
  const [phone, setPhone] = useState(draft.phone_number ?? "");

  const send = async () => {
    if (!phone) return toast({ title: "Phone number required", variant: "destructive" });
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
    setDraft({ phone_number: phone, whatsapp_sent_at: new Date().toISOString(), status: "sent" });
    if (draft.lead_id) {
      await supabase.from("leads").update({ status: "Quote Sent" }).eq("id", draft.lead_id);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm">
          <div><span className="text-muted-foreground">Vehicle:</span> {draft.registration_number} — {draft.make} {draft.model}</div>
          <div><span className="text-muted-foreground">Insurer:</span> {draft.insurer_name} | {draft.plan_type}</div>
          <div><span className="text-muted-foreground">IDV:</span> {inr(draft.idv)} | <span className="text-muted-foreground">Net:</span> {inr(draft.net_premium)}</div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Customer name</Label><Input value={draft.customer_name ?? ""} onChange={(e) => setDraft({ customer_name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9999999999" /></div>
      </div>

      <div>
        <Label>WhatsApp message</Label>
        <Textarea rows={10} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button onClick={send} className={sent ? "bg-success text-success-foreground hover:bg-success/90" : ""}>
            {sent ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {sent ? "Sent — Send again" : "Send on WhatsApp"}
          </Button>
          <Button onClick={onNext} disabled={!sent}>Next: KYC →</Button>
        </div>
      </div>
    </div>
  );
};
