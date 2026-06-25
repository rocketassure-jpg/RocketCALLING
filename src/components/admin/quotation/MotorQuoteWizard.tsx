import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { VehicleInputStep } from "./steps/VehicleInputStep";
import { QuoteListStep } from "./steps/QuoteListStep";
import { QuoteSendStep } from "./steps/QuoteSendStep";
import { KycStep } from "./steps/KycStep";
import { PaymentStep } from "./steps/PaymentStep";
import { toast } from "@/hooks/use-toast";

export type QuoteDraft = {
  id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  phone_number?: string | null;
  registration_number?: string;
  make?: string; model?: string; variant?: string;
  mfg_year?: number; fuel_type?: string; rto_code?: string;
  policy_type?: string;
  previous_insurer?: string | null;
  previous_expiry_date?: string | null;
  insurer_code?: string | null;
  insurer_name?: string | null;
  plan_type?: string;
  idv?: number;
  od_premium?: number;
  tp_premium?: number;
  addon_premium?: number;
  net_premium?: number;
  gst_amount?: number;
  gross_premium?: number;
  selected_addons?: string[];
  status?: string;
  current_step?: number;
  whatsapp_sent_at?: string | null;
  kyc_status?: string;
  kyc_pan?: string | null;
  kyc_aadhaar_last4?: string | null;
  payment_link?: string | null;
  payment_sent_at?: string | null;
};

const STEPS = ["Vehicle", "Quotes", "Send", "KYC", "Payment"];

export const MotorQuoteWizard = ({
  open, onOpenChange, lead, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead?: { id?: string; customer_id?: string | null; customer_name?: string; phone_number?: string; registration_number?: string };
  onSaved?: () => void;
}) => {
  const { user, companyId } = useAuth();
  const [draft, setDraftState] = useState<QuoteDraft | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!open || !companyId) return;
    (async () => {
      // Resume in-progress quote for this lead, else create a new one
      let existing: any = null;
      if (lead?.id) {
        const { data } = await supabase
          .from("motor_quotes").select("*")
          .eq("lead_id", lead.id).neq("status", "converted")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        existing = data;
      }
      if (!existing) {
        const { data, error } = await supabase.from("motor_quotes").insert({
          company_id: companyId,
          lead_id: lead?.id ?? null,
          customer_id: lead?.customer_id ?? null,
          registration_number: (lead?.registration_number ?? "PENDING").toUpperCase(),
          created_by: user?.id ?? null,
          status: "draft", current_step: 1,
        }).select("*").single();
        if (error) { toast({ title: "Failed to start", description: error.message, variant: "destructive" }); return; }
        existing = data;
      }
      setDraftState({
        ...existing,
        customer_name: lead?.customer_name ?? existing.customer_name,
        phone_number: lead?.phone_number ?? existing.phone_number,
      });
      setStep(existing.current_step ?? 1);
    })();
  }, [open, companyId, lead?.id]);

  const persist = async (patch: Partial<QuoteDraft>, newStep?: number) => {
    if (!draft) return;
    const next: QuoteDraft = { ...draft, ...patch, current_step: newStep ?? draft.current_step };
    setDraftState(next);
    const { id, ...rest } = next as any;
    const updates: any = { ...rest };
    delete updates.customer_name; // not a column on motor_quotes
    delete updates.phone_number;
    await supabase.from("motor_quotes").update(updates).eq("id", id);
  };

  const setDraft = (patch: Partial<QuoteDraft>) => persist(patch);

  const goto = async (n: number) => {
    await persist({}, n);
    setStep(n);
    if (n === 5) onSaved?.();
  };

  if (!draft) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Motor Quotation</SheetTitle>
          <div className="flex flex-wrap gap-1 pt-2">
            {STEPS.map((s, i) => (
              <Badge key={s} variant={i + 1 === step ? "default" : i + 1 < step ? "secondary" : "outline"}>
                {i + 1}. {s}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        <div className="mt-4">
          {step === 1 && <VehicleInputStep draft={draft} setDraft={setDraft} onNext={() => goto(2)} />}
          {step === 2 && <QuoteListStep draft={draft} setDraft={setDraft} onNext={() => goto(3)} onBack={() => goto(1)} />}
          {step === 3 && <QuoteSendStep draft={draft} setDraft={setDraft} onNext={() => goto(4)} onBack={() => goto(2)} />}
          {step === 4 && <KycStep draft={draft} setDraft={setDraft} onNext={() => goto(5)} onBack={() => goto(3)} />}
          {step === 5 && <PaymentStep draft={draft} setDraft={setDraft} onClose={() => { onOpenChange(false); onSaved?.(); }} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MotorQuoteWizard;
