import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Area = { id: string; name: string };
type Profile = { id: string; full_name: string };
type Row = { customer_name: string; phone_number: string; policy_type: string; area_name?: string; call_date?: string; premium_amount?: string };

const POLICIES = ["Life", "Health", "Motor"];
const today = () => new Date().toISOString().slice(0, 10);
const normalizePhone = (p: string) => (p || "").replace(/\D/g, "").slice(-10);

export const CSVImporter = ({ areas, telecallers, onDone }: { areas: Area[]; telecallers: Profile[]; onDone: () => void }) => {
  const [defaultAreaId, setDefaultAreaId] = useState("");
  const [defaultTelecaller, setDefaultTelecaller] = useState<string>("none");
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "merge">("merge");
  const [paste, setPaste] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const parse = (text: string) => {
    setParsing(true); setErrors([]); setPreview([]);
    Papa.parse<Row>(text, {
      header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const errs: string[] = [];
        const rows: Row[] = [];
        res.data.forEach((r, i) => {
          const row = r as any;
          if (!row.customer_name || !row.phone_number) { errs.push(`Row ${i + 2}: missing name/phone`); return; }
          const policy = POLICIES.includes(row.policy_type) ? row.policy_type : "Motor";
          rows.push({
            customer_name: String(row.customer_name).trim(),
            phone_number: String(row.phone_number).trim(),
            policy_type: policy,
            area_name: row.area || row.area_name,
            call_date: row.call_date || undefined,
            premium_amount: row.premium_amount || undefined,
          });
        });
        setPreview(rows); setErrors(errs); setParsing(false);
      },
    });
  };

  const handleFile = async (f: File) => parse(await f.text());

  const doImport = async () => {
    if (preview.length === 0) return toast({ title: "Nothing to import", variant: "destructive" });
    setImporting(true);
    const areaMap = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));

    // Get existing phones for dedupe
    const { data: existing } = await supabase.from("leads").select("id,phone_number");
    const existingMap = new Map((existing ?? []).map((e) => [normalizePhone(e.phone_number), e.id]));

    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];
    let skipped = 0, merged = 0;

    for (const r of preview) {
      const areaId = (r.area_name && areaMap.get(r.area_name.toLowerCase())) || defaultAreaId;
      if (!areaId) { skipped++; continue; }
      const phoneKey = normalizePhone(r.phone_number);
      const data: any = {
        customer_name: r.customer_name,
        phone_number: r.phone_number,
        area_id: areaId,
        policy_type: r.policy_type,
        call_date: r.call_date || today(),
        premium_amount: Number(r.premium_amount || 0),
      };
      if (defaultTelecaller && defaultTelecaller !== "none") data.assigned_telecaller = defaultTelecaller;

      const existId = existingMap.get(phoneKey);
      if (existId) {
        if (duplicateMode === "skip") { skipped++; continue; }
        toUpdate.push({ id: existId, data }); merged++;
      } else {
        toInsert.push(data);
      }
    }

    let inserted = 0;
    if (toInsert.length) {
      const { error, count } = await supabase.from("leads").insert(toInsert, { count: "exact" });
      if (error) { setImporting(false); return toast({ title: "Import failed", description: error.message, variant: "destructive" }); }
      inserted = count ?? toInsert.length;
    }
    for (const u of toUpdate) {
      await supabase.from("leads").update(u.data).eq("id", u.id);
    }

    setImporting(false);
    toast({ title: "Import done", description: `${inserted} new, ${merged} merged, ${skipped} skipped` });
    setPreview([]); setPaste(""); onDone();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Bulk CSV Import</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-gradient-soft border p-4 text-sm">
          <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Required headers</div>
          <code className="mt-2 block text-xs">customer_name, phone_number, policy_type, area, call_date, premium_amount</code>
          <p className="mt-2 text-muted-foreground">Only <code>customer_name</code> and <code>phone_number</code> are mandatory. <code>area</code> falls back to default below. Phone numbers are deduped on the last 10 digits.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Default Area (fallback)</Label>
            <Select value={defaultAreaId} onValueChange={setDefaultAreaId}>
              <SelectTrigger><SelectValue placeholder="Choose area" /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign Telecaller</Label>
            <Select value={defaultTelecaller} onValueChange={setDefaultTelecaller}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Duplicate phones</Label>
            <Select value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge (update existing)</SelectItem>
                <SelectItem value="skip">Skip duplicates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="upload">
          <TabsList><TabsTrigger value="upload">Upload File</TabsTrigger><TabsTrigger value="paste">Paste CSV</TabsTrigger></TabsList>
          <TabsContent value="upload" className="pt-3">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </TabsContent>
          <TabsContent value="paste" className="space-y-2 pt-3">
            <Textarea rows={6} placeholder="customer_name,phone_number,policy_type,area&#10;Ramesh,9876543210,Motor,Dewas" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <Button variant="outline" onClick={() => parse(paste)} disabled={!paste.trim()}>Parse</Button>
          </TabsContent>
        </Tabs>

        {parsing && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</div>}

        {errors.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning"><AlertTriangle className="h-4 w-4" /> {errors.length} parse warnings</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" /> <span className="font-medium">{preview.length}</span> rows ready</div>
              <Button variant="hero" onClick={doImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import {preview.length} leads
              </Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th>
                  <th className="p-2 text-left">Policy</th><th className="p-2 text-left">Area</th>
                  <th className="p-2 text-left">Call date</th><th className="p-2 text-right">Premium</th>
                </tr></thead>
                <tbody>{preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.customer_name}</td>
                    <td className="p-2 font-mono">{r.phone_number}</td>
                    <td className="p-2"><Badge variant="outline">{r.policy_type}</Badge></td>
                    <td className="p-2">{r.area_name || <span className="text-muted-foreground italic">default</span>}</td>
                    <td className="p-2">{r.call_date || today()}</td>
                    <td className="p-2 text-right">₹{r.premium_amount || 0}</td>
                  </tr>
                ))}</tbody>
              </table>
              {preview.length > 50 && <div className="p-2 text-center text-xs text-muted-foreground">…and {preview.length - 50} more</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
