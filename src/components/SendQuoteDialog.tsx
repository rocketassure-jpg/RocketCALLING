import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: {
    id: string;
    customer_name: string;
    phone_number: string;
    policy_type: string;
    premium_amount?: number | null;
  };
  onSent?: () => void;
};

const PLAN_TYPES = ["Comprehensive", "Third Party (TP)", "Standalone OD"];
const TOP_INSURERS = ["HDFC ERGO", "Bajaj Allianz", "ICICI Lombard", "Tata AIG", "IFFCO Tokio", "Reliance General", "Digit", "Acko"];

const todayPlus = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const SendQuoteDialog = ({ open, onOpenChange, lead, onSent }: Props) => {
  const { user, companyId } = useAuth();
  const [insurer, setInsurer] = useState("");
  const [premium, setPremium] = useState<string>(lead.premium_amount ? String(lead.premium_amount) : "");
  const [idv, setIdv] = useState("");
  const [planType, setPlanType] = useState(PLAN_TYPES[0]);
  const [validUntil, setValidUntil] = useState(todayPlus(7));
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const isMotor = lead.policy_type?.toLowerCase() === "motor";

  const autoMessage = useMemo(() => {
    const lines = [
      `Namaste ${lead.customer_name} ji! 🙏`,
      `Aapke ${lead.policy_type} insurance ka quote:`,
      insurer ? `🏢 Insurer: ${insurer}` : "",
      premium ? `💰 Premium: ₹${Number(premium).toLocaleString("en-IN")}/year` : "",
      isMotor && idv ? `🚗 IDV: ₹${Number(idv).toLocaleString("en-IN")}` : "",
      isMotor ? `📋 Plan: ${planType}` : "",
      validUntil ? `⏰ Valid till: ${new Date(validUntil).toLocaleDateString("en-IN")}` : "",
      "",
      "Confirm karein to aaj hi process ho jaye!",
    ].filter(Boolean);
    return lines.join("\n");
  }, [lead.customer_name, lead.policy_type, insurer, premium, idv, planType, validUntil, isMotor]);

  useEffect(() => { if (open) setMessage(autoMessage); }, [open, autoMessage]);

  const send = async () => {
    if (!insurer.trim() || !premium) {
      return toast({ title: "Insurer aur premium zaroori hai", variant: "destructive" });
    }
    setSending(true);
    try {
      const { error } = await supabase.from("lead_quotes").insert({
        company_id: companyId,
        lead_id: lead.id,
        insurer: insurer.trim(),
        policy_type: lead.policy_type,
        premium: Number(premium),
        idv: idv ? Number(idv) : null,
        plan_type: isMotor ? planType : null,
        valid_until: validUntil,
        message_sent: message,
        channel: "whatsapp",
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      // bump lead to Quote Sent
      await supabase.from("leads").update({ status: "Quote Sent" as any }).eq("id", lead.id);
      // open WhatsApp
      const url = `https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast({ title: "Quote saved & WhatsApp opened" });
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Quote save fail", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Send Quote — {lead.customer_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Policy Type</Label>
            <Input value={lead.policy_type} disabled />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Insurer *</Label>
              <Select value={insurer} onValueChange={setInsurer}>
                <SelectTrigger><SelectValue placeholder="Choose insurer" /></SelectTrigger>
                <SelectContent>
                  {TOP_INSURERS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Premium (₹) *</Label>
              <Input type="number" inputMode="numeric" value={premium} onChange={(e) => setPremium(e.target.value)} />
            </div>
          </div>
          {isMotor && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>IDV (₹)</Label>
                <Input type="number" inputMode="numeric" value={idv} onChange={(e) => setIdv(e.target.value)} />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Valid Until</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send on WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendQuoteDialog;
