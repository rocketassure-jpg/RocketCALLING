import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert, RefreshCw, Eye } from "lucide-react";

type Row = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
};

const TABLES = ["all", "policy_transactions", "broker_payouts", "agent_payouts", "claims", "expenses", "premium_remittance", "user_roles", "commission_rates"];
const ACTIONS = ["all", "INSERT", "UPDATE", "DELETE"];

export const AuditLogViewer = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [tbl, setTbl] = useState("all");
  const [act, setAct] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    let qb = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (tbl !== "all") qb = qb.eq("table_name", tbl);
    if (act !== "all") qb = qb.eq("action", act);
    const { data } = await qb;
    setRows((data ?? []) as any);
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name").in("id", ids as string[]);
      setProfiles(Object.fromEntries((ps ?? []).map((p: any) => [p.id, p.full_name || p.id.slice(0, 8)])));
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tbl, act]);

  const filtered = useMemo(() => rows.filter((r) => !q || (r.record_id || "").includes(q) || (r.table_name || "").includes(q)), [rows, q]);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Tamper-evident record of changes to sensitive tables.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 md:grid-cols-4">
          <Select value={tbl} onValueChange={setTbl}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={act} onValueChange={setAct}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Search record id / table" value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{filtered.length} entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead>
              <TableHead>Table</TableHead><TableHead>Record</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No entries.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.user_id ? (profiles[r.user_id] ?? r.user_id.slice(0, 8)) : "system"}</TableCell>
                  <TableCell><Badge variant={r.action === "DELETE" ? "destructive" : r.action === "INSERT" ? "default" : "secondary"}>{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                  <TableCell className="font-mono text-[10px]">{r.record_id?.slice(0, 8)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setView(r)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{view?.action} · {view?.table_name}</DialogTitle></DialogHeader>
          {view && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Before</div>
                <pre className="max-h-[400px] overflow-auto rounded border bg-muted p-2 text-[10px]">{JSON.stringify(view.old_data, null, 2)}</pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">After</div>
                <pre className="max-h-[400px] overflow-auto rounded border bg-muted p-2 text-[10px]">{JSON.stringify(view.new_data, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
