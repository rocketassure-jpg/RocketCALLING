import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Database, Download, RefreshCw, Loader2 } from "lucide-react";

const TABLES = [
  "companies","profiles","user_roles","leads","customers","enquiries",
  "call_logs","dial_logs","policy_transactions","motor_policies","health_policies","life_policies",
  "claims","brokers","broker_payouts","broker_targets","broker_slabs","broker_achievements","broker_company_mapping",
  "agent_payouts","commission_rates","insurers","branches","areas","tasks","expenses","complaints",
  "service_requests","rto_cases","vehicles","rc_register","permits","sms_logs","whatsapp_logs",
  "audit_logs","super_admin_audit_log","impersonation_sessions","announcements","feature_flags",
  "global_settings","plan_templates","modules","company_subscriptions","customer_documents","claim_documents",
];

const toCSV = (rows: any[]) => {
  if (!rows.length) return "";
  const colSet = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => colSet.add(k)));
  const cols = Array.from(colSet);
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};

export const DataExplorerPanel = () => {
  const [table, setTable] = useState("companies");
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("__all");
  const [limit, setLimit] = useState(500);
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    supabase.from("companies").select("id,name").order("name").then(({ data }) => setCompanies(data ?? []));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://lgqgnsngxhqdzpstiddj.supabase.co/functions/v1/super-admin-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: "query_table", table, company_id: companyId, limit }),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) return toast({ title: "Failed", description: j.error, variant: "destructive" });
    setRows(j.rows ?? []); setCount(j.count ?? 0);
  };

  const download = () => {
    if (!rows.length) return toast({ title: "No data to export" });
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}_${companyId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!rows.length) return;
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}_${companyId}_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filtered = filter
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
    : rows;

  const cols = rows.length ? Object.keys(rows[0]).slice(0, 8) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Platform Data Explorer</CardTitle>
        <p className="text-xs text-muted-foreground">View &amp; download data from any company. Super admin only — bypasses RLS via service role.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px_auto]">
          <Select value={table} onValueChange={setTable}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">🌐 All companies</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} placeholder="Limit" />
          <Button onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Fetch
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filtered.length} of {count ?? rows.length} rows</Badge>
            <Input placeholder="Filter rows…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-64 h-8" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={download} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</Button>
            <Button size="sm" variant="outline" onClick={downloadJSON} disabled={!rows.length}><Download className="h-4 w-4" /> JSON</Button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>{cols.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={cols.length || 1} className="text-center text-sm text-muted-foreground p-6">
                  {rows.length === 0 ? "Click Fetch to load data." : "No matching rows."}
                </TableCell></TableRow>
              ) : filtered.slice(0, 200).map((r, i) => (
                <TableRow key={i}>
                  {cols.map((c) => (
                    <TableCell key={c} className="text-xs max-w-[240px] truncate" title={typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}>
                      {r[c] == null ? "—" : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 200 && <p className="text-xs text-muted-foreground">Showing first 200 rows in preview. Download CSV/JSON for full data.</p>}
      </CardContent>
    </Card>
  );
};
