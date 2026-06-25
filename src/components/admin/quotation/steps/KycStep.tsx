import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { QuoteDraft } from "../MotorQuoteWizard";

const DOC_TYPES = [
  { key: "pan",      label: "PAN Card",         required: true },
  { key: "aadhaar",  label: "Aadhaar",          required: true },
  { key: "rc",       label: "Vehicle RC",       required: false },
  { key: "dl",       label: "Driving License",  required: false },
];

export const KycStep = ({
  draft, setDraft, onNext, onBack,
}: {
  draft: QuoteDraft;
  setDraft: (d: Partial<QuoteDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const { user, companyId } = useAuth();
  const [pan, setPan] = useState(draft.kyc_pan ?? "");
  const [aadhaar, setAadhaar] = useState(draft.kyc_aadhaar_last4 ?? "");
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const status = draft.kyc_status ?? "pending";

  const upload = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast({ title: "Max 5 MB", variant: "destructive" });
    setBusy(key);
    try {
      const path = `${companyId}/${draft.id}/${key}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("customer-docs").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("customer-docs").createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = signed?.signedUrl ?? path;
      setUploads((s) => ({ ...s, [key]: url }));
      if (draft.customer_id && companyId) {
        await supabase.from("customer_documents").insert({
          company_id: companyId,
          customer_id: draft.customer_id,
          motor_quote_id: draft.id,
          doc_type: key,
          label: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user?.id ?? null,
        });
      }
      toast({ title: `${key.toUpperCase()} uploaded` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const submit = async () => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return toast({ title: "Invalid PAN format", variant: "destructive" });
    if (aadhaar && !/^\d{4}$/.test(aadhaar)) return toast({ title: "Aadhaar must be last 4 digits", variant: "destructive" });
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("policyboss-kyc-submit", {
        body: {
          motor_quote_id: draft.id, pan, aadhaar_last4: aadhaar,
          document_urls: Object.values(uploads),
        },
      });
      if (error) throw error;
      setDraft({ kyc_pan: pan, kyc_aadhaar_last4: aadhaar, kyc_status: data?.kyc_status ?? "verified", status: "kyc_done" });
      toast({ title: data?.message ?? "KYC submitted" });
    } catch (e: any) {
      toast({ title: "KYC failed", description: e?.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">KYC Status:</span>
        <Badge variant={status === "verified" ? "default" : "outline"}
               className={status === "verified" ? "bg-success text-success-foreground" : ""}>
          {status}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>PAN Number</Label><Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} /></div>
        <div><Label>Aadhaar last 4</Label><Input value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {DOC_TYPES.map((d) => (
          <Card key={d.key}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{d.label} {d.required && <span className="text-destructive">*</span>}</div>
                {uploads[d.key] && <Badge className="bg-success text-success-foreground">Uploaded</Badge>}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted/50">
                {busy === d.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>Choose file (jpg/png/pdf, max 5MB)</span>
                <input
                  type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(d.key, e.target.files[0])}
                />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit KYC
          </Button>
          <Button onClick={onNext} disabled={status !== "verified" && status !== "kyc_done"}>Next: Payment →</Button>
        </div>
      </div>
    </div>
  );
};
