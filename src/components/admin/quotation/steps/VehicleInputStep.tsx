import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { QuoteDraft } from "../MotorQuoteWizard";

export const VehicleInputStep = ({
  draft, setDraft, onNext,
}: {
  draft: QuoteDraft;
  setDraft: (d: Partial<QuoteDraft>) => void;
  onNext: () => void;
}) => {
  const [fetching, setFetching] = useState(false);

  const fetchDetails = async () => {
    const reg = (draft.registration_number || "").toUpperCase().replace(/\s+/g, "");
    if (!reg || reg.length < 6) return toast({ title: "Enter a valid registration number", variant: "destructive" });
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-vehicle-details", {
        body: { registration_number: reg },
      });
      if (error) throw error;
      const v = data?.vehicle ?? {};
      setDraft({
        registration_number: reg,
        make: v.make ?? draft.make,
        model: v.model ?? draft.model,
        variant: v.variant ?? draft.variant,
        mfg_year: v.mfg_year ?? draft.mfg_year,
        fuel_type: v.fuel_type ?? draft.fuel_type,
        rto_code: v.rto_code ?? draft.rto_code,
        idv: v.declared_value ?? draft.idv ?? 450000,
      });
      toast({ title: data?.source === "cache" ? "Loaded from cache" : "Vehicle details fetched" });
    } catch (e: any) {
      toast({ title: "Lookup failed", description: e?.message, variant: "destructive" });
    } finally { setFetching(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Vehicle Registration Number</Label>
        <div className="flex gap-2">
          <Input
            value={draft.registration_number ?? ""}
            onChange={(e) => setDraft({ registration_number: e.target.value.toUpperCase().slice(0, 10) })}
            placeholder="MP09AB1234"
            className="font-mono"
          />
          <Button onClick={fetchDetails} disabled={fetching}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Make</Label><Input value={draft.make ?? ""} onChange={(e) => setDraft({ make: e.target.value })} /></div>
        <div><Label>Model</Label><Input value={draft.model ?? ""} onChange={(e) => setDraft({ model: e.target.value })} /></div>
        <div><Label>Variant</Label><Input value={draft.variant ?? ""} onChange={(e) => setDraft({ variant: e.target.value })} /></div>
        <div><Label>Mfg Year</Label><Input type="number" value={draft.mfg_year ?? ""} onChange={(e) => setDraft({ mfg_year: Number(e.target.value) || undefined })} /></div>
        <div>
          <Label>Fuel</Label>
          <Select value={draft.fuel_type ?? ""} onValueChange={(v) => setDraft({ fuel_type: v })}>
            <SelectTrigger><SelectValue placeholder="Fuel" /></SelectTrigger>
            <SelectContent>
              {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>RTO</Label><Input value={draft.rto_code ?? ""} onChange={(e) => setDraft({ rto_code: e.target.value })} /></div>
      </div>

      <div>
        <Label>Policy Type</Label>
        <Select value={draft.policy_type ?? "new"} onValueChange={(v) => setDraft({ policy_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New Policy</SelectItem>
            <SelectItem value="renewal">Renewal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {draft.policy_type === "renewal" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Previous Insurer</Label><Input value={draft.previous_insurer ?? ""} onChange={(e) => setDraft({ previous_insurer: e.target.value })} /></div>
          <div><Label>Previous Expiry</Label><Input type="date" value={draft.previous_expiry_date ?? ""} onChange={(e) => setDraft({ previous_expiry_date: e.target.value })} /></div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!draft.make || !draft.model}>Get Quotes →</Button>
      </div>
    </div>
  );
};
