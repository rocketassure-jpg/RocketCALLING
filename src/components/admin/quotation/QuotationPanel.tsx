import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus } from "lucide-react";
import { MotorQuoteWizard } from "./MotorQuoteWizard";

type Row = {
  id: string; registration_number: string;
  make: string | null; model: string | null;
  insurer_name: string | null; net_premium: number | null; gross_premium: number | null;
  status: string; kyc_status: string | null;
  current_step: number | null; created_at: string;
  lead_id: string | null; customer_id: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "outline", generated: "secondary", sent: "secondary",
  kyc_done: "default", payment_sent: "default", converted: "default", lost: "destructive",
};

const inr = (n?: number | null) => n ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—";

export const QuotationPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    let q = supabase.from("motor_quotes")
      .select("id,registration_number,make,model,insurer_name,net_premium,gross_premium,status,kyc_status,current_step,created_at,lead_id,customer_id")
      .order("created_at", { ascending: false }).limit(200);
    const { data } = await q;
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (!search || r.registration_number.toUpperCase().includes(search.toUpperCase()) ||
     (r.insurer_name ?? "").toLowerCase().includes(search.toLowerCase()))
  ), [rows, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const converted = rows.filter((r) => r.status === "converted").length;
    const inFlight = rows.filter((r) => !["converted", "lost"].includes(r.status)).length;
    const gwv = rows.filter((r) => r.status === "converted").reduce((s, r) => s + (r.gross_premium ?? 0), 0);
    return { total, converted, inFlight, gwv };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Quotation Module</h2>
          <p className="text-sm text-muted-foreground">
            Vehicle → Quote → WhatsApp → KYC → Payment. All quotes live here.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setWizardOpen(true); }}>
          <Plus className="h-4 w-4" /> New Motor Quote
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total Quotes" value={kpis.total} />
        <KpiCard label="In Flight" value={kpis.inFlight} />
        <KpiCard label="Converted" value={kpis.converted} />
        <KpiCard label="GWP (converted)" value={inr(kpis.gwv)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Quotes ({filtered.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input className="w-56" placeholder="Search reg no / insurer" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all", "draft", "generated", "sent", "kyc_done", "payment_sent", "converted", "lost"].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Insurer</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.registration_number}
                    <div className="text-[10px] text-muted-foreground">{r.make} {r.model}</div>
                  </TableCell>
                  <TableCell>{r.insurer_name ?? "—"}</TableCell>
                  <TableCell className="font-mono">{inr(r.gross_premium ?? r.net_premium)}</TableCell>
                  <TableCell>{r.current_step ?? 1}/5</TableCell>
                  <TableCell><Badge variant={(STATUS_COLOR[r.status] as any) ?? "outline"}>{r.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.kyc_status ?? "—"}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(r); setWizardOpen(true); }}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No quotes yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MotorQuoteWizard
        open={wizardOpen}
        onOpenChange={(v) => { setWizardOpen(v); if (!v) load(); }}
        lead={editing ? { id: editing.lead_id ?? undefined, customer_id: editing.customer_id, registration_number: editing.registration_number } : undefined}
        onSaved={load}
      />
    </div>
  );
};

const KpiCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card><CardContent className="pt-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </CardContent></Card>
);

export default QuotationPanel;
