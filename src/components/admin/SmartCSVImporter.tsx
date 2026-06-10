import { useState, useMemo } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Area = { id: string; name: string };

// Target CRM fields user can map to
const CRM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "customer_name", label: "Owner Name *", required: true },
  { key: "phone_number", label: "Mobile 1 *", required: true },
  { key: "registration_number", label: "Registration Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "engine_number", label: "Engine Number" },
  { key: "vehicle_type", label: "Vehicle Type" },
  { key: "maker_name", label: "Maker" },
  { key: "model_name", label: "Model" },
  { key: "fuel_type", label: "Fuel Type" },
  { key: "reg_date", label: "Registration Date" },
  { key: "fitness_upto", label: "Fitness Upto" },
  { key: "pucc_upto", label: "PUC Upto" },
  { key: "father_name", label: "Father Name" },
  { key: "authorised_person", label: "Authorised Person" },
  { key: "mobile_2", label: "Mobile 2" },
  { key: "current_address", label: "Current Address" },
  { key: "permanent_address", label: "Permanent Address" },
  { key: "delivery_address", label: "Delivery Address" },
  { key: "city_village", label: "City / Village" },
  { key: "policy_number", label: "Policy Number" },
  { key: "insurance_company", label: "Insurance Company" },
  { key: "policy_type", label: "Policy Type (Life/Health/Motor)" },
  { key: "issue_date", label: "Policy Issue Date" },
  { key: "expiry_date", label: "Policy Expiry Date" },
  { key: "policy_expiry_date", label: "Policy Expiry (alert)" },
  { key: "agent_sm_name", label: "Agent / SM Name" },
  { key: "vendor_name", label: "Vendor Name" },
  { key: "policy_copy_url", label: "Policy Copy URL" },
  { key: "net_od", label: "Net OD" },
  { key: "tp_premium", label: "TP Premium" },
  { key: "total_premium_incl_gst", label: "Total Premium (incl GST)" },
  { key: "premium_amount", label: "Premium Amount" },
  { key: "cash_back", label: "Cash Back" },
  { key: "payment_mode", label: "Payment Mode" },
  { key: "payment_status", label: "Payment Status" },
  { key: "remark", label: "Remark" },
  { key: "notes", label: "Notes" },
];

const NUMERIC = new Set(["net_od", "tp_premium", "total_premium_incl_gst", "premium_amount", "cash_back"]);
const DATE_FIELDS = new Set(["reg_date", "fitness_upto", "pucc_upto", "issue_date", "expiry_date", "policy_expiry_date", "call_date"]);

const autoMatch = (header: string): string => {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const direct = CRM_FIELDS.find((f) => f.key.replace(/_/g, "") === h);
  if (direct) return direct.key;
  if (h.includes("registration") || h === "regno" || h === "vehicleno") return "registration_number";
  if (h.includes("chass")) return "chassis_number";
  if (h.includes("engine")) return "engine_number";
  if (h.includes("maker") || h.includes("brand")) return "maker_name";
  if (h.includes("model")) return "model_name";
  if (h.includes("fuel")) return "fuel_type";
  if (h.includes("owner") || h.includes("name") && !h.includes("father") && !h.includes("agent")) return "customer_name";
  if (h.includes("mobile1") || h === "mobile" || h === "phone" || h.includes("contact")) return "phone_number";
  if (h.includes("mobile2") || h === "altphone") return "mobile_2";
  if (h.includes("father")) return "father_name";
  if (h.includes("city") || h.includes("village")) return "city_village";
  if (h.includes("policyno") || h.includes("policynumber")) return "policy_number";
  if (h.includes("insurer") || h.includes("insurance")) return "insurance_company";
  if (h.includes("expiry")) return "expiry_date";
  if (h.includes("issue")) return "issue_date";
  if (h.includes("regdate")) return "reg_date";
  if (h.includes("fitness")) return "fitness_upto";
  if (h.includes("puc")) return "pucc_upto";
  if (h.includes("netod")) return "net_od";
  if (h.includes("tppremium") || h === "tp") return "tp_premium";
  if (h.includes("totalpremium") || h.includes("grosspremium")) return "total_premium_incl_gst";
  if (h.includes("premium")) return "premium_amount";
  if (h.includes("cashback")) return "cash_back";
  if (h.includes("agent") || h.includes("sm")) return "agent_sm_name";
  if (h.includes("vendor")) return "vendor_name";
  if (h.includes("remark")) return "remark";
  if (h.includes("note")) return "notes";
  return "__skip__";
};

const parseDate = (v: any): string | null => {
  if (!v) return null;
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const normPhone = (p: string) => (p || "").replace(/\D/g, "").slice(-10);

export const SmartCSVImporter = ({ areas, onDone }: { areas: Area[]; onDone: () => void }) => {
  const { companyId } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultAreaId, setDefaultAreaId] = useState("");
  const [defaultPolicyType, setDefaultPolicyType] = useState("Motor");
  const [importing, setImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [result, setResult] = useState<{ inserted: number; duplicates: number; failed: number } | null>(null);

  const handleFile = (file: File) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hdrs = res.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(res.data);
        const auto: Record<string, string> = {};
        hdrs.forEach((h) => (auto[h] = autoMatch(h)));
        setMapping(auto);
        setStep(2);
      },
      error: (e) => toast({ title: "CSV parse error", description: e.message, variant: "destructive" }),
    });
  };

  const mappedTargets = useMemo(() => Object.values(mapping).filter((v) => v !== "__skip__"), [mapping]);
  const hasRequired = mappedTargets.includes("customer_name") && mappedTargets.includes("phone_number");

  const doImport = async () => {
    if (!defaultAreaId) {
      toast({ title: "Select default area", variant: "destructive" });
      return;
    }
    setImporting(true);
    setDuplicates([]);

    // Check existing registration numbers for warning
    const regCol = Object.entries(mapping).find(([, v]) => v === "registration_number")?.[0];
    const incomingRegs = regCol ? rows.map((r) => r[regCol]).filter(Boolean).map(String) : [];
    let dupSet = new Set<string>();
    if (incomingRegs.length) {
      const { data: existing } = await supabase
        .from("leads")
        .select("registration_number")
        .in("registration_number", incomingRegs);
      dupSet = new Set((existing ?? []).map((e: any) => e.registration_number));
    }

    const inserts: any[] = [];
    const skipped: string[] = [];
    rows.forEach((row, idx) => {
      const obj: any = { area_id: defaultAreaId, policy_type: defaultPolicyType, lead_source: "CSV Upload" };
      Object.entries(mapping).forEach(([col, target]) => {
        if (target === "__skip__") return;
        let val = row[col];
        if (val === undefined || val === null || val === "") return;
        if (NUMERIC.has(target)) val = Number(String(val).replace(/[^\d.-]/g, "")) || 0;
        else if (DATE_FIELDS.has(target)) val = parseDate(val);
        else if (target === "phone_number" || target === "mobile_2") val = normPhone(String(val));
        else val = String(val).trim();
        if (val !== null) obj[target] = val;
      });
      if (!obj.customer_name || !obj.phone_number) return;
      if (obj.registration_number && dupSet.has(obj.registration_number)) {
        skipped.push(`Row ${idx + 2}: ${obj.registration_number} already exists`);
        return;
      }
      inserts.push(obj);
    });

    let inserted = 0;
    let failed = 0;
    // Batch insert in chunks of 100
    for (let i = 0; i < inserts.length; i += 100) {
      const chunk = inserts.slice(i, i + 100);
      const { error, count } = await supabase.from("leads").insert(chunk, { count: "exact" });
      if (error) failed += chunk.length;
      else inserted += count ?? chunk.length;
    }

    setDuplicates(skipped);
    setResult({ inserted, duplicates: skipped.length, failed });
    setStep(3);
    setImporting(false);
    if (inserted) toast({ title: `Imported ${inserted} leads`, description: skipped.length ? `${skipped.length} duplicates skipped` : undefined });
    onDone();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Smart CSV / Sheet Importer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <Label>Upload CSV file</Label>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <p className="text-sm text-muted-foreground">After upload, you'll map your sheet columns to CRM fields.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Default Area *</Label>
                <Select value={defaultAreaId} onValueChange={setDefaultAreaId}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Policy Type</Label>
                <Select value={defaultPolicyType} onValueChange={setDefaultPolicyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Motor">Motor</SelectItem>
                    <SelectItem value="Life">Life</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-muted/40 p-3 text-sm font-semibold">
                <div>Sheet Column</div><div></div><div>CRM Field</div>
              </div>
              <div className="max-h-96 divide-y overflow-y-auto">
                {headers.map((h) => (
                  <div key={h} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-3 text-sm">
                    <div className="font-medium">{h} <span className="text-xs text-muted-foreground">({String(rows[0]?.[h] ?? "").slice(0, 20)})</span></div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select value={mapping[h] ?? "__skip__"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— Skip —</SelectItem>
                        {CRM_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {!hasRequired && (
              <div className="flex items-center gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">
                <AlertTriangle className="h-4 w-4" /> Map at least Owner Name and Mobile 1 to continue.
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={doImport} disabled={!hasRequired || importing} className="flex-1">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /> Import complete</div>
            <div className="grid grid-cols-3 gap-3">
              <Badge variant="default" className="justify-center py-2">Inserted: {result.inserted}</Badge>
              <Badge variant="secondary" className="justify-center py-2">Duplicates: {result.duplicates}</Badge>
              <Badge variant="destructive" className="justify-center py-2">Failed: {result.failed}</Badge>
            </div>
            {duplicates.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
                {duplicates.map((d, i) => <div key={i}>{d}</div>)}
              </div>
            )}
            <Button onClick={() => { setStep(1); setResult(null); setRows([]); setHeaders([]); }} className="w-full">Import another file</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
