import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, Download, Search, Calculator, ShieldCheck, Wallet, Car, Banknote, Users, MapPin, Receipt, History, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

// shared types
type AnyRow = Record<string, any>;
const sb: any = supabase;

const PAYOUT_TABLES = [
  "payout_insurance_rules",
  "payout_agent_split_rules",
  "payout_rto_rules",
  "payout_finance_rules",
  "payout_vendor_rules",
  "payout_state_rules",
  "payout_tax_rules",
] as const;
type PayoutTable = (typeof PAYOUT_TABLES)[number];

// helpers
const monthStart = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
const fmtMonth = (s: string) => {
  const d = new Date(s);
  return d.toLocaleString("default", { month: "short", year: "numeric" });
};
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function downloadDemo(rows: AnyRow[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// Shared hook: read latest snapshot per logical key for selected month, by group key fields
function usePayoutRules(table: PayoutTable, month: string, companyId: string | null) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await sb
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .lte("effective_month", month)
      .order("effective_month", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return;
    setRows(data || []);
  }, [table, month, companyId]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

// Month picker
function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ym = value.slice(0, 7);
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Input
        type="month"
        value={ym}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-");
          if (y && m) onChange(`${y}-${m}-01`);
        }}
        className="h-8 w-[160px]"
      />
    </div>
  );
}

// Bulk import button (reads excel/csv → calls onImport with parsed rows)
function BulkImport({ demo, demoName, onImport }: { demo: AnyRow[]; demoName: string; onImport: (rows: AnyRow[]) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => downloadDemo(demo, demoName)}>
        <Download className="h-3.5 w-3.5 mr-1" /> Demo Excel
      </Button>
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5 mr-1" /> Import Excel
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf);
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<AnyRow>(ws);
          await onImport(json);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
    </>
  );
}

// Generic confirm-delete
async function delRow(table: PayoutTable, id: string) {
  return sb.from(table).delete().eq("id", id);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 1 — Insurance Commission Rules                                         */
/* ────────────────────────────────────────────────────────────────────────── */
function InsuranceCommissionTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_insurance_rules", month, companyId);
  const { toast } = useToast();
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  const filtered = rows.filter(r =>
    (!search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) &&
    (!filterCompany || (r.insurer_name || "").toLowerCase().includes(filterCompany.toLowerCase())) &&
    (!filterProduct || (r.product_category || "").toLowerCase().includes(filterProduct.toLowerCase()))
  );

  const save = async (data: AnyRow) => {
    const payload = {
      company_id: companyId,
      insurer_name: data.insurer_name || null,
      product_category: data.product_category || "",
      sub_category: data.sub_category || null,
      commission_type: data.commission_type || "percentage",
      commission_pct: Number(data.commission_pct) || 0,
      flat_amount: Number(data.flat_amount) || 0,
      effective_month: month,
      is_active: data.is_active ?? true,
      notes: data.notes || null,
    };
    // Versioning: always insert a new row (do not overwrite history)
    const { error } = await sb.from("payout_insurance_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved", description: `Rule for ${fmtMonth(month)} added.` });
    setOpen(false); setEditing(null); reload();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Insurance Commission Rules</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" /><Input className="h-8 pl-7 w-[160px]" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Input className="h-8 w-[140px]" placeholder="Filter Company" value={filterCompany} onChange={e => setFilterCompany(e.target.value)} />
          <Input className="h-8 w-[140px]" placeholder="Filter Product" value={filterProduct} onChange={e => setFilterProduct(e.target.value)} />
          <BulkImport
            demoName="insurance-commission-demo.xlsx"
            demo={[{ insurer_name: "ICICI Lombard", product_category: "Private Car", sub_category: "Comprehensive", commission_type: "percentage", commission_pct: 18, flat_amount: 0, is_active: true }]}
            onImport={async (json) => {
              const payload = json.map(r => ({
                company_id: companyId,
                insurer_name: r.insurer_name,
                product_category: r.product_category,
                sub_category: r.sub_category || null,
                commission_type: r.commission_type || "percentage",
                commission_pct: Number(r.commission_pct) || 0,
                flat_amount: Number(r.flat_amount) || 0,
                effective_month: month,
                is_active: r.is_active !== false,
              }));
              const { error } = await sb.from("payout_insurance_rules").insert(payload);
              if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
              else { toast({ title: `${payload.length} rules imported.` }); reload(); }
            }}
          />
          <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Rule</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insurer</TableHead><TableHead>Product</TableHead><TableHead>Sub</TableHead>
              <TableHead>Type</TableHead><TableHead className="text-right">Rate</TableHead>
              <TableHead>Effective</TableHead><TableHead>Status</TableHead>
              <TableHead>Updated</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No rules for {fmtMonth(month)} yet.</TableCell></TableRow>}
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.insurer_name || "—"}</TableCell>
                <TableCell>{r.product_category}</TableCell>
                <TableCell>{r.sub_category || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.commission_type}</Badge></TableCell>
                <TableCell className="text-right">{r.commission_type === "flat" ? inr(r.flat_amount) : `${r.commission_pct}%`}</TableCell>
                <TableCell className="text-xs">{fmtMonth(r.effective_month)}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await delRow("payout_insurance_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Insurance Rule · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <InsuranceForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
function InsuranceForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ commission_type: "percentage", is_active: true, ...initial });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Insurer Name</Label><Input value={d.insurer_name || ""} onChange={e => setD({ ...d, insurer_name: e.target.value })} /></div>
        <div><Label>Product Category</Label><Input value={d.product_category || ""} onChange={e => setD({ ...d, product_category: e.target.value })} placeholder="Private Car / Bike / Health" /></div>
        <div><Label>Sub Category</Label><Input value={d.sub_category || ""} onChange={e => setD({ ...d, sub_category: e.target.value })} placeholder="Comprehensive / TP / OD" /></div>
        <div><Label>Commission Type</Label>
          <Select value={d.commission_type} onValueChange={v => setD({ ...d, commission_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="flat">Flat</SelectItem><SelectItem value="slab">Slab</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Commission %</Label><Input type="number" step="0.001" value={d.commission_pct ?? ""} onChange={e => setD({ ...d, commission_pct: e.target.value })} /></div>
        <div><Label>Flat Amount</Label><Input type="number" value={d.flat_amount ?? ""} onChange={e => setD({ ...d, flat_amount: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save for {fmtMonth(initial.effective_month || new Date().toISOString())}</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 2 — Agent Split Rules                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function AgentSplitTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_agent_split_rules", month, companyId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [calcPremium, setCalcPremium] = useState(20000);
  const [calcRule, setCalcRule] = useState<AnyRow | null>(null);

  useEffect(() => { setCalcRule(rows[0] || null); }, [rows]);

  const save = async (d: AnyRow) => {
    const sum = (Number(d.agent_pct) || 0) + (Number(d.branch_pct) || 0) + (Number(d.admin_pct) || 0) + (Number(d.referral_pct) || 0);
    if (Math.round(sum) !== 100) return toast({ title: "Splits must sum to 100%", description: `Currently ${sum}%`, variant: "destructive" });
    const payload = {
      company_id: companyId,
      rule_name: d.rule_name,
      commission_pct: Number(d.commission_pct) || 0,
      agent_pct: Number(d.agent_pct) || 0,
      branch_pct: Number(d.branch_pct) || 0,
      admin_pct: Number(d.admin_pct) || 0,
      referral_pct: Number(d.referral_pct) || 0,
      effective_month: month,
      is_active: d.is_active ?? true,
      is_default: !!d.is_default,
    };
    const { error } = await sb.from("payout_agent_split_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); setEditing(null); reload();
  };

  const commission = calcRule ? (calcPremium * (calcRule.commission_pct || 0)) / 100 : 0;
  const split = (pct: number) => (commission * (pct || 0)) / 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Agent Split Rules</CardTitle>
          <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Comm%</TableHead><TableHead>Agent</TableHead><TableHead>Branch</TableHead><TableHead>Admin</TableHead><TableHead>Referral</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No split rules.</TableCell></TableRow>}
              {rows.map(r => (
                <TableRow key={r.id} className={calcRule?.id === r.id ? "bg-accent/40" : ""} onClick={() => setCalcRule(r)} role="button">
                  <TableCell className="font-medium">{r.rule_name}{r.is_default && <Badge className="ml-2 text-[10px]" variant="outline">Default</Badge>}</TableCell>
                  <TableCell>{r.commission_pct}%</TableCell>
                  <TableCell>{r.agent_pct}%</TableCell><TableCell>{r.branch_pct}%</TableCell><TableCell>{r.admin_pct}%</TableCell><TableCell>{r.referral_pct}%</TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async (e) => { e.stopPropagation(); await delRow("payout_agent_split_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Live Calculator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Premium</Label><Input type="number" value={calcPremium} onChange={e => setCalcPremium(Number(e.target.value) || 0)} /></div>
          <div className="text-xs text-muted-foreground">Rule: {calcRule?.rule_name || "—"}</div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Commission ({calcRule?.commission_pct || 0}%)</span><span className="font-medium">{inr(commission)}</span></div>
            <div className="flex justify-between"><span>Agent ({calcRule?.agent_pct || 0}%)</span><span>{inr(split(calcRule?.agent_pct))}</span></div>
            <div className="flex justify-between"><span>Branch ({calcRule?.branch_pct || 0}%)</span><span>{inr(split(calcRule?.branch_pct))}</span></div>
            <div className="flex justify-between"><span>Admin ({calcRule?.admin_pct || 0}%)</span><span>{inr(split(calcRule?.admin_pct))}</span></div>
            <div className="flex justify-between"><span>Referral ({calcRule?.referral_pct || 0}%)</span><span>{inr(split(calcRule?.referral_pct))}</span></div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Split Rule · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <SplitForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SplitForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ is_active: true, commission_pct: 20, agent_pct: 60, branch_pct: 20, admin_pct: 15, referral_pct: 5, ...initial });
  const sum = (Number(d.agent_pct) || 0) + (Number(d.branch_pct) || 0) + (Number(d.admin_pct) || 0) + (Number(d.referral_pct) || 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Rule Name</Label><Input value={d.rule_name || ""} onChange={e => setD({ ...d, rule_name: e.target.value })} /></div>
        <div><Label>Commission %</Label><Input type="number" value={d.commission_pct ?? ""} onChange={e => setD({ ...d, commission_pct: e.target.value })} /></div>
        <div><Label>Agent %</Label><Input type="number" value={d.agent_pct ?? ""} onChange={e => setD({ ...d, agent_pct: e.target.value })} /></div>
        <div><Label>Branch %</Label><Input type="number" value={d.branch_pct ?? ""} onChange={e => setD({ ...d, branch_pct: e.target.value })} /></div>
        <div><Label>Admin %</Label><Input type="number" value={d.admin_pct ?? ""} onChange={e => setD({ ...d, admin_pct: e.target.value })} /></div>
        <div><Label>Referral %</Label><Input type="number" value={d.referral_pct ?? ""} onChange={e => setD({ ...d, referral_pct: e.target.value })} /></div>
      </div>
      <div className={`text-xs ${Math.round(sum) === 100 ? "text-muted-foreground" : "text-destructive"}`}>Splits total: {sum}% {Math.round(sum) !== 100 && "(must equal 100%)"}</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
        <div className="flex items-center gap-2"><Switch checked={!!d.is_default} onCheckedChange={v => setD({ ...d, is_default: v })} /><Label>Default</Label></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 3 — RTO Pricing Rules                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function RtoPricingTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_rto_rules", month, companyId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const save = async (d: AnyRow) => {
    const payload = {
      company_id: companyId,
      service_name: d.service_name, govt_fee: Number(d.govt_fee) || 0,
      customer_price: Number(d.customer_price) || 0, agent_payout: Number(d.agent_payout) || 0,
      processing_days: Number(d.processing_days) || 0, is_active: d.is_active ?? true, effective_month: month,
    };
    const { error } = await sb.from("payout_rto_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); setEditing(null); reload();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> RTO Pricing Rules</CardTitle>
        <div className="flex items-center gap-2">
          <BulkImport
            demoName="rto-pricing-demo.xlsx"
            demo={[{ service_name: "New RC", govt_fee: 600, customer_price: 1500, agent_payout: 300, processing_days: 7, is_active: true }, { service_name: "Transfer RC", govt_fee: 900, customer_price: 2500, agent_payout: 500, processing_days: 10, is_active: true }]}
            onImport={async (json) => {
              const payload = json.map(r => ({ company_id: companyId, service_name: r.service_name, govt_fee: Number(r.govt_fee) || 0, customer_price: Number(r.customer_price) || 0, agent_payout: Number(r.agent_payout) || 0, processing_days: Number(r.processing_days) || 0, is_active: r.is_active !== false, effective_month: month }));
              const { error } = await sb.from("payout_rto_rules").insert(payload);
              if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
              else { toast({ title: `${payload.length} services imported.` }); reload(); }
            }}
          />
          <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Service</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Govt Fee</TableHead><TableHead className="text-right">Customer</TableHead><TableHead className="text-right">Agent</TableHead><TableHead className="text-right">Margin</TableHead><TableHead>Days</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No services.</TableCell></TableRow>}
            {rows.map(r => {
              const margin = (r.customer_price || 0) - (r.govt_fee || 0) - (r.agent_payout || 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.service_name}</TableCell>
                  <TableCell className="text-right">{inr(r.govt_fee)}</TableCell>
                  <TableCell className="text-right">{inr(r.customer_price)}</TableCell>
                  <TableCell className="text-right">{inr(r.agent_payout)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{inr(margin)}</TableCell>
                  <TableCell>{r.processing_days}d</TableCell>
                  <TableCell className="text-xs">{fmtMonth(r.effective_month)}</TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await delRow("payout_rto_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} RTO Service · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <RtoForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
function RtoForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ is_active: true, ...initial });
  const margin = (Number(d.customer_price) || 0) - (Number(d.govt_fee) || 0) - (Number(d.agent_payout) || 0);
  return (
    <div className="space-y-3">
      <div><Label>Service Name</Label><Input value={d.service_name || ""} onChange={e => setD({ ...d, service_name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Govt Fee</Label><Input type="number" value={d.govt_fee ?? ""} onChange={e => setD({ ...d, govt_fee: e.target.value })} /></div>
        <div><Label>Customer Price</Label><Input type="number" value={d.customer_price ?? ""} onChange={e => setD({ ...d, customer_price: e.target.value })} /></div>
        <div><Label>Agent Payout</Label><Input type="number" value={d.agent_payout ?? ""} onChange={e => setD({ ...d, agent_payout: e.target.value })} /></div>
        <div><Label>Processing Days</Label><Input type="number" value={d.processing_days ?? ""} onChange={e => setD({ ...d, processing_days: e.target.value })} /></div>
      </div>
      <div className="rounded-md border bg-muted/30 p-2 text-sm flex justify-between"><span>Auto Margin</span><span className="font-medium text-primary">{inr(margin)}</span></div>
      <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 4 — Finance Commission Rules                                           */
/* ────────────────────────────────────────────────────────────────────────── */
function FinanceCommissionTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_finance_rules", month, companyId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [loanAmt, setLoanAmt] = useState(1000000);
  const [calcRule, setCalcRule] = useState<AnyRow | null>(null);
  useEffect(() => { setCalcRule(rows[0] || null); }, [rows]);
  const save = async (d: AnyRow) => {
    const payload = { company_id: companyId, bank: d.bank, product: d.product, commission_pct: Number(d.commission_pct) || 0, processing_fee: Number(d.processing_fee) || 0, agent_share_pct: Number(d.agent_share_pct) || 0, is_active: d.is_active ?? true, effective_month: month };
    const { error } = await sb.from("payout_finance_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); reload();
  };
  const earned = calcRule ? (loanAmt * (calcRule.commission_pct || 0)) / 100 : 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> Finance Commission Rules</CardTitle>
          <div className="flex items-center gap-2">
            <BulkImport demoName="finance-rules-demo.xlsx" demo={[{ bank: "HDFC Bank", product: "Car Loan", commission_pct: 1.2, processing_fee: 0, agent_share_pct: 60, is_active: true }]} onImport={async (json) => {
              const payload = json.map(r => ({ company_id: companyId, bank: r.bank, product: r.product, commission_pct: Number(r.commission_pct) || 0, processing_fee: Number(r.processing_fee) || 0, agent_share_pct: Number(r.agent_share_pct) || 0, is_active: r.is_active !== false, effective_month: month }));
              const { error } = await sb.from("payout_finance_rules").insert(payload);
              if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" }); else { toast({ title: `${payload.length} imported.` }); reload(); }
            }} />
            <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Product</TableHead><TableHead>Comm%</TableHead><TableHead>Proc Fee</TableHead><TableHead>Agent%</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No rules.</TableCell></TableRow>}
              {rows.map(r => (
                <TableRow key={r.id} className={calcRule?.id === r.id ? "bg-accent/40" : ""} onClick={() => setCalcRule(r)} role="button">
                  <TableCell className="font-medium">{r.bank}</TableCell><TableCell>{r.product}</TableCell>
                  <TableCell>{r.commission_pct}%</TableCell><TableCell>{inr(r.processing_fee)}</TableCell><TableCell>{r.agent_share_pct}%</TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async (e) => { e.stopPropagation(); await delRow("payout_finance_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Live Calculator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Loan Amount</Label><Input type="number" value={loanAmt} onChange={e => setLoanAmt(Number(e.target.value) || 0)} /></div>
          <div className="text-xs text-muted-foreground">{calcRule ? `${calcRule.bank} · ${calcRule.product} · ${calcRule.commission_pct}%` : "Select a rule"}</div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span>Commission Earned</span><span className="font-medium">{inr(earned)}</span></div>
            <div className="flex justify-between"><span>Agent Share ({calcRule?.agent_share_pct || 0}%)</span><span>{inr((earned * (calcRule?.agent_share_pct || 0)) / 100)}</span></div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Finance Rule · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <FinanceForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function FinanceForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ is_active: true, ...initial });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Bank</Label><Input value={d.bank || ""} onChange={e => setD({ ...d, bank: e.target.value })} /></div>
        <div><Label>Product</Label><Input value={d.product || ""} onChange={e => setD({ ...d, product: e.target.value })} placeholder="Car Loan / Business Loan" /></div>
        <div><Label>Commission %</Label><Input type="number" step="0.001" value={d.commission_pct ?? ""} onChange={e => setD({ ...d, commission_pct: e.target.value })} /></div>
        <div><Label>Processing Fee</Label><Input type="number" value={d.processing_fee ?? ""} onChange={e => setD({ ...d, processing_fee: e.target.value })} /></div>
        <div><Label>Agent Share %</Label><Input type="number" value={d.agent_share_pct ?? ""} onChange={e => setD({ ...d, agent_share_pct: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 5 — Vendor Rules                                                       */
/* ────────────────────────────────────────────────────────────────────────── */
const VENDOR_TYPES = ["Broker", "POS", "DSA", "Insurance Company", "Aggregator"];
function VendorRulesTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_vendor_rules", month, companyId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const save = async (d: AnyRow) => {
    const payload = { company_id: companyId, vendor_name: d.vendor_name, vendor_type: d.vendor_type, product_type: d.product_type || null, commission_pct: Number(d.commission_pct) || 0, flat_amount: Number(d.flat_amount) || 0, is_active: d.is_active ?? true, notes: d.notes || null, effective_month: month };
    const { error } = await sb.from("payout_vendor_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); reload();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Vendor Rules</CardTitle>
        <div className="flex items-center gap-2">
          <BulkImport demoName="vendor-rules-demo.xlsx" demo={[{ vendor_name: "ABC Broker", vendor_type: "Broker", product_type: "Motor", commission_pct: 15, flat_amount: 0, is_active: true }]} onImport={async (json) => {
            const payload = json.map(r => ({ company_id: companyId, vendor_name: r.vendor_name, vendor_type: r.vendor_type, product_type: r.product_type || null, commission_pct: Number(r.commission_pct) || 0, flat_amount: Number(r.flat_amount) || 0, is_active: r.is_active !== false, effective_month: month }));
            const { error } = await sb.from("payout_vendor_rules").insert(payload);
            if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" }); else { toast({ title: `${payload.length} imported.` }); reload(); }
          }} />
          <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Vendor</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Type</TableHead><TableHead>Product</TableHead><TableHead>Comm%</TableHead><TableHead>Flat</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No vendors.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.vendor_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.vendor_type}</Badge></TableCell>
                <TableCell>{r.product_type || "—"}</TableCell>
                <TableCell>{r.commission_pct}%</TableCell><TableCell>{inr(r.flat_amount)}</TableCell>
                <TableCell className="text-xs">{fmtMonth(r.effective_month)}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await delRow("payout_vendor_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Vendor · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <VendorForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
function VendorForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ is_active: true, vendor_type: "Broker", ...initial });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Vendor Name</Label><Input value={d.vendor_name || ""} onChange={e => setD({ ...d, vendor_name: e.target.value })} /></div>
        <div><Label>Vendor Type</Label>
          <Select value={d.vendor_type} onValueChange={v => setD({ ...d, vendor_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Product Type</Label><Input value={d.product_type || ""} onChange={e => setD({ ...d, product_type: e.target.value })} /></div>
        <div><Label>Commission %</Label><Input type="number" step="0.001" value={d.commission_pct ?? ""} onChange={e => setD({ ...d, commission_pct: e.target.value })} /></div>
        <div><Label>Flat Amount</Label><Input type="number" value={d.flat_amount ?? ""} onChange={e => setD({ ...d, flat_amount: e.target.value })} /></div>
      </div>
      <div><Label>Notes</Label><Input value={d.notes || ""} onChange={e => setD({ ...d, notes: e.target.value })} /></div>
      <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 6 — State Wise Rules                                                   */
/* ────────────────────────────────────────────────────────────────────────── */
function StateWiseTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_state_rules", month, companyId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const save = async (d: AnyRow) => {
    const payload = { company_id: companyId, state: d.state, rto_charges: Number(d.rto_charges) || 0, stamp_duty: Number(d.stamp_duty) || 0, special_tax: Number(d.special_tax) || 0, is_active: d.is_active ?? true, effective_month: month };
    const { error } = await sb.from("payout_state_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setOpen(false); reload();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> State Wise Rules</CardTitle>
        <div className="flex items-center gap-2">
          <BulkImport demoName="state-rules-demo.xlsx" demo={[{ state: "Maharashtra", rto_charges: 1200, stamp_duty: 200, special_tax: 0, is_active: true }]} onImport={async (json) => {
            const payload = json.map(r => ({ company_id: companyId, state: r.state, rto_charges: Number(r.rto_charges) || 0, stamp_duty: Number(r.stamp_duty) || 0, special_tax: Number(r.special_tax) || 0, is_active: r.is_active !== false, effective_month: month }));
            const { error } = await sb.from("payout_state_rules").insert(payload);
            if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" }); else { toast({ title: `${payload.length} imported.` }); reload(); }
          }} />
          <Button size="sm" onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add State</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>State</TableHead><TableHead>RTO Charges</TableHead><TableHead>Stamp Duty</TableHead><TableHead>Special Tax</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No states.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.state}</TableCell>
                <TableCell>{inr(r.rto_charges)}</TableCell><TableCell>{inr(r.stamp_duty)}</TableCell><TableCell>{inr(r.special_tax)}</TableCell>
                <TableCell className="text-xs">{fmtMonth(r.effective_month)}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await delRow("payout_state_rules", r.id); reload(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} State · {fmtMonth(month)}</DialogTitle></DialogHeader>
          {editing && <StateForm initial={editing} onSave={save} onCancel={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
function StateForm({ initial, onSave, onCancel }: { initial: AnyRow; onSave: (d: AnyRow) => void; onCancel: () => void }) {
  const [d, setD] = useState<AnyRow>({ is_active: true, ...initial });
  return (
    <div className="space-y-3">
      <div><Label>State</Label><Input value={d.state || ""} onChange={e => setD({ ...d, state: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>RTO Charges</Label><Input type="number" value={d.rto_charges ?? ""} onChange={e => setD({ ...d, rto_charges: e.target.value })} /></div>
        <div><Label>Stamp Duty</Label><Input type="number" value={d.stamp_duty ?? ""} onChange={e => setD({ ...d, stamp_duty: e.target.value })} /></div>
        <div><Label>Special Tax</Label><Input type="number" value={d.special_tax ?? ""} onChange={e => setD({ ...d, special_tax: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={!!d.is_active} onCheckedChange={v => setD({ ...d, is_active: v })} /><Label>Active</Label></div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(d)}>Save</Button></DialogFooter>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 7 — Tax & GST Rules                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function TaxGstTab({ month, companyId }: { month: string; companyId: string | null }) {
  const { rows, reload } = usePayoutRules("payout_tax_rules", month, companyId);
  const { toast } = useToast();
  const latest = rows[0];
  const [d, setD] = useState<AnyRow>({ gst_pct: 18, tds_pct: 5, service_tax_pct: 0, invoice_prefix: "INV", invoice_format: "INV-{YYYY}-{####}", auto_gst: true, auto_invoice: true });
  useEffect(() => { if (latest) setD(latest); }, [latest?.id]);
  const save = async () => {
    const payload = { company_id: companyId, gst_pct: Number(d.gst_pct) || 0, tds_pct: Number(d.tds_pct) || 0, service_tax_pct: Number(d.service_tax_pct) || 0, invoice_prefix: d.invoice_prefix, invoice_format: d.invoice_format, auto_gst: !!d.auto_gst, auto_invoice: !!d.auto_invoice, is_active: true, effective_month: month };
    const { error } = await sb.from("payout_tax_rules").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); reload();
  };
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Tax & GST Rules</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label>GST %</Label><Input type="number" step="0.001" value={d.gst_pct ?? ""} onChange={e => setD({ ...d, gst_pct: e.target.value })} /></div>
          <div><Label>TDS %</Label><Input type="number" step="0.001" value={d.tds_pct ?? ""} onChange={e => setD({ ...d, tds_pct: e.target.value })} /></div>
          <div><Label>Service Tax %</Label><Input type="number" step="0.001" value={d.service_tax_pct ?? ""} onChange={e => setD({ ...d, service_tax_pct: e.target.value })} /></div>
          <div><Label>Invoice Prefix</Label><Input value={d.invoice_prefix || ""} onChange={e => setD({ ...d, invoice_prefix: e.target.value })} /></div>
          <div className="col-span-2"><Label>Invoice Format</Label><Input value={d.invoice_format || ""} onChange={e => setD({ ...d, invoice_format: e.target.value })} placeholder="INV-{YYYY}-{####}" /></div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><Switch checked={!!d.auto_gst} onCheckedChange={v => setD({ ...d, auto_gst: v })} /><Label>Auto GST Calculation</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!d.auto_invoice} onCheckedChange={v => setD({ ...d, auto_invoice: v })} /><Label>Auto Invoice Generation</Label></div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">Active version: {latest ? fmtMonth(latest.effective_month) : "—"}</div>
          <Button onClick={save}>Save for {fmtMonth(month)}</Button>
        </div>

        <div className="border-t pt-3">
          <Label className="text-xs uppercase text-muted-foreground">History</Label>
          <Table>
            <TableHeader><TableRow><TableHead>Effective</TableHead><TableHead>GST</TableHead><TableHead>TDS</TableHead><TableHead>Invoice Fmt</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}><TableCell>{fmtMonth(r.effective_month)}</TableCell><TableCell>{r.gst_pct}%</TableCell><TableCell>{r.tds_pct}%</TableCell><TableCell className="text-xs">{r.invoice_format}</TableCell><TableCell className="text-xs">{fmtDate(r.updated_at)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 8 — Audit Logs                                                         */
/* ────────────────────────────────────────────────────────────────────────── */
function AuditLogsTab({ companyId }: { companyId: string | null }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  useEffect(() => {
    if (!companyId) return;
    sb.from("audit_logs")
      .select("id, user_id, action, table_name, record_id, old_data, new_data, created_at, profiles:profiles!audit_logs_user_id_fkey(full_name)")
      .eq("company_id", companyId)
      .in("table_name", PAYOUT_TABLES as any)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data || []));
  }, [companyId]);
  // fallback if FK alias fails
  useEffect(() => {
    if (!companyId || rows.length) return;
    sb.from("audit_logs").select("*").eq("company_id", companyId).in("table_name", PAYOUT_TABLES as any).order("created_at", { ascending: false }).limit(200).then(({ data }: any) => setRows(data || []));
  }, [companyId, rows.length]);
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Audit Logs · Payout Changes</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Module</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead><TableHead>Old</TableHead><TableHead>New</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No changes logged.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                <TableCell className="text-xs">{r.profiles?.full_name || r.user_id?.slice(0, 8) || "—"}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.table_name?.replace("payout_", "").replace("_rules", "")}</Badge></TableCell>
                <TableCell><Badge variant={r.action === "DELETE" ? "destructive" : "secondary"} className="text-[10px]">{r.action}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{r.record_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">{r.old_data ? JSON.stringify(r.old_data).slice(0, 100) : "—"}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{r.new_data ? JSON.stringify(r.new_data).slice(0, 100) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Main Shell                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */
export default function PayoutSetupEngine() {
  const [month, setMonth] = useState<string>(() => monthStart(new Date()));
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    sb.auth.getUser().then(async ({ data }: any) => {
      const uid = data?.user?.id;
      if (!uid) return;
      const { data: p } = await sb.from("profiles").select("company_id").eq("id", uid).maybeSingle();
      setCompanyId(p?.company_id ?? null);
    });
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Payout Setup Engine</h2>
          <p className="text-xs text-muted-foreground">Configure all commission, payout, margin and pricing rules from one central location. Each rule is versioned by month — historical entries keep their original rate.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Effective Month</Label>
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      <Tabs defaultValue="insurance" className="space-y-3">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="insurance" className="text-xs"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Insurance</TabsTrigger>
          <TabsTrigger value="split" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" /> Agent Split</TabsTrigger>
          <TabsTrigger value="rto" className="text-xs"><Car className="h-3.5 w-3.5 mr-1" /> RTO Pricing</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs"><Banknote className="h-3.5 w-3.5 mr-1" /> Finance</TabsTrigger>
          <TabsTrigger value="vendor" className="text-xs"><Wallet className="h-3.5 w-3.5 mr-1" /> Vendor</TabsTrigger>
          <TabsTrigger value="state" className="text-xs"><MapPin className="h-3.5 w-3.5 mr-1" /> State Wise</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs"><Receipt className="h-3.5 w-3.5 mr-1" /> Tax & GST</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs"><History className="h-3.5 w-3.5 mr-1" /> Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="insurance"><InsuranceCommissionTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="split"><AgentSplitTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="rto"><RtoPricingTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="finance"><FinanceCommissionTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="vendor"><VendorRulesTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="state"><StateWiseTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="tax"><TaxGstTab month={month} companyId={companyId} /></TabsContent>
        <TabsContent value="audit"><AuditLogsTab companyId={companyId} /></TabsContent>
      </Tabs>
    </div>
  );
}
