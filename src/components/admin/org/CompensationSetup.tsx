import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Plus, Trash2, Wallet } from "lucide-react";

type Designation = { key: string; label: string; is_active: boolean };
type Branch = { id: string; name: string };
type Rule = {
  id: string;
  designation_key: string;
  branch_id: string | null;
  user_id: string | null;
  base_salary: number;
  incentive_type: string;
  incentive_value: number;
  commission_percent: number;
  slabs: any;
  effective_month: string;
  notes: string | null;
};

const INCENTIVE_TYPES = [
  { value: "flat_monthly", label: "Flat Monthly" },
  { value: "per_policy", label: "Per Policy" },
  { value: "per_lead_won", label: "Per Lead Won" },
  { value: "percent_of_premium", label: "% of Premium" },
  { value: "slab_based", label: "Slab Based" },
];

const monthInput = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const toMonthDate = (m: string) => `${m}-01`;

export default function CompensationSetup() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [month, setMonth] = useState(monthInput());
  const [loading, setLoading] = useState(true);

  // new-rule form
  const [form, setForm] = useState({
    designation_key: "",
    branch_id: "all",
    base_salary: 0,
    incentive_type: "flat_monthly",
    incentive_value: 0,
    commission_percent: 0,
    notes: "",
  });

  // calculator
  const [calc, setCalc] = useState({ designation_key: "", policies: 10, premium: 50000, leads_won: 5 });

  const load = async () => {
    setLoading(true);
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", me.user!.id).maybeSingle();
    const cid = (prof as any)?.company_id;
    setCompanyId(cid);
    if (!cid) { setLoading(false); return; }
    const [{ data: ds }, { data: bs }, { data: rs }] = await Promise.all([
      (supabase as any).from("employee_designations").select("key,label,is_active").eq("company_id", cid).order("sort_order"),
      supabase.from("branches").select("id,name").eq("company_id", cid),
      (supabase as any).from("compensation_rules").select("*").eq("company_id", cid).order("effective_month", { ascending: false }),
    ]);
    setDesignations((ds as any) || []);
    setBranches((bs as any) || []);
    setRules((rs as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const monthRules = useMemo(() => rules.filter(r => r.effective_month <= toMonthDate(month)), [rules, month]);

  // For lookup: latest rule for designation ≤ current month
  const activeFor = (key: string) => {
    const candidates = monthRules.filter(r => r.designation_key === key && !r.user_id);
    return candidates[0]; // already sorted desc
  };

  const saveRule = async () => {
    if (!companyId || !form.designation_key) return toast({ title: "Select designation", variant: "destructive" });
    const { error } = await (supabase as any).from("compensation_rules").insert({
      company_id: companyId,
      designation_key: form.designation_key,
      branch_id: form.branch_id === "all" ? null : form.branch_id,
      base_salary: form.base_salary,
      incentive_type: form.incentive_type,
      incentive_value: form.incentive_value,
      commission_percent: form.commission_percent,
      effective_month: toMonthDate(month),
      notes: form.notes || null,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule saved", description: "Historical entries remain untouched." });
    setForm({ designation_key: "", branch_id: "all", base_salary: 0, incentive_type: "flat_monthly", incentive_value: 0, commission_percent: 0, notes: "" });
    load();
  };

  const deleteRule = async (id: string) => {
    await (supabase as any).from("compensation_rules").delete().eq("id", id);
    load();
  };

  const calcResult = useMemo(() => {
    const r = activeFor(calc.designation_key);
    if (!r) return null;
    let incentive = 0;
    switch (r.incentive_type) {
      case "flat_monthly": incentive = r.incentive_value; break;
      case "per_policy": incentive = r.incentive_value * calc.policies; break;
      case "per_lead_won": incentive = r.incentive_value * calc.leads_won; break;
      case "percent_of_premium": incentive = (r.incentive_value / 100) * calc.premium; break;
      case "slab_based": incentive = r.incentive_value; break;
    }
    const commission = (r.commission_percent / 100) * calc.premium;
    return { base: r.base_salary, incentive, commission, total: r.base_salary + incentive + commission };
  }, [calc, rules, month]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Compensation Setup</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Effective Date</Label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Every save creates a new versioned row for the selected month. Past months keep their original rules — historical payouts won't change.
          </p>

          <div className="grid md:grid-cols-3 gap-3 p-3 border border-border rounded-lg bg-muted/30">
            <div>
              <Label className="text-xs">Designation</Label>
              <Select value={form.designation_key} onValueChange={v => setForm({ ...form, designation_key: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {designations.filter(d => d.is_active).map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Applies To Branch</Label>
              <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Base Salary (₹/mo)</Label>
              <Input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Incentive Type</Label>
              <Select value={form.incentive_type} onValueChange={v => setForm({ ...form, incentive_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCENTIVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incentive Value</Label>
              <Input type="number" value={form.incentive_value} onChange={e => setForm({ ...form, incentive_value: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Commission %</Label>
              <Input type="number" step="0.01" value={form.commission_percent} onChange={e => setForm({ ...form, commission_percent: +e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={saveRule}><Plus className="h-4 w-4 mr-1" /> Save Rule for {month}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Rules (month-wise history)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective Month</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Base ₹</TableHead>
                <TableHead>Incentive</TableHead>
                <TableHead>Comm %</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">No rules yet.</TableCell></TableRow>}
              {rules.map(r => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.effective_month.slice(0, 7)}</Badge></TableCell>
                  <TableCell>{designations.find(d => d.key === r.designation_key)?.label || r.designation_key}</TableCell>
                  <TableCell>{r.branch_id ? branches.find(b => b.id === r.branch_id)?.name : "All"}</TableCell>
                  <TableCell>₹{r.base_salary.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{INCENTIVE_TYPES.find(t => t.value === r.incentive_type)?.label}: {r.incentive_value}</TableCell>
                  <TableCell>{r.commission_percent}%</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Payout Calculator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Designation</Label>
              <Select value={calc.designation_key} onValueChange={v => setCalc({ ...calc, designation_key: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {designations.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Policies Sold</Label><Input type="number" value={calc.policies} onChange={e => setCalc({ ...calc, policies: +e.target.value })} /></div>
            <div><Label className="text-xs">Total Premium ₹</Label><Input type="number" value={calc.premium} onChange={e => setCalc({ ...calc, premium: +e.target.value })} /></div>
            <div><Label className="text-xs">Leads Won</Label><Input type="number" value={calc.leads_won} onChange={e => setCalc({ ...calc, leads_won: +e.target.value })} /></div>
          </div>
          {calcResult ? (
            <div className="grid md:grid-cols-4 gap-3 pt-2">
              <Stat label="Base Salary" value={calcResult.base} />
              <Stat label="Incentive" value={calcResult.incentive} />
              <Stat label="Commission" value={calcResult.commission} />
              <Stat label="Total Payout" value={calcResult.total} primary />
            </div>
          ) : calc.designation_key ? (
            <p className="text-xs text-muted-foreground">No active rule for this designation in {month}.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border border-border ${primary ? "bg-primary/10" : "bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${primary ? "text-primary" : ""}`}>₹{Math.round(value).toLocaleString()}</div>
    </div>
  );
}
