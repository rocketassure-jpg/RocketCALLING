import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";

type Branch = { id: string; name: string };
type Profile = { id: string; branch_id: string | null };
type Txn = { id: string; agent_id: string | null; gross_premium: number | null; company_share: number | null; commission_amount: number | null; txn_date: string };
type Expense = { id: string; branch_id: string | null; amount: number; expense_date: string };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const ym = (d: Date) => d.toISOString().slice(0, 7);

export const BranchPnL = () => {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [exps, setExps] = useState<Expense[]>([]);

  const load = async () => {
    const [b, p, t, e] = await Promise.all([
      supabase.from("branches").select("id,name").order("name"),
      supabase.from("profiles").select("id,branch_id"),
      supabase.from("policy_transactions").select("id,agent_id,gross_premium,company_share,commission_amount,txn_date").gte("txn_date", from).lte("txn_date", to),
      supabase.from("expenses").select("id,branch_id,amount,expense_date").gte("expense_date", from).lte("expense_date", to),
    ]);
    setBranches((b.data ?? []) as any); setProfiles((p.data ?? []) as any);
    setTxns((t.data ?? []) as any); setExps((e.data ?? []) as any);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const branchOfAgent = useMemo(() => { const m = new Map<string, string | null>(); profiles.forEach((p) => m.set(p.id, p.branch_id)); return m; }, [profiles]);

  const rows = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; income: number; commission: number; expense: number }>();
    branches.forEach((b) => map.set(b.id, { name: b.name, gross: 0, income: 0, commission: 0, expense: 0 }));
    map.set("__unassigned", { name: "Unassigned", gross: 0, income: 0, commission: 0, expense: 0 });
    txns.forEach((t) => {
      const bid = (t.agent_id && branchOfAgent.get(t.agent_id)) || "__unassigned";
      const row = map.get(bid) || map.get("__unassigned")!;
      row.gross += Number(t.gross_premium || 0);
      row.income += Number(t.company_share || 0);
      row.commission += Number(t.commission_amount || 0);
    });
    exps.forEach((e) => {
      const bid = e.branch_id || "__unassigned";
      const row = map.get(bid) || map.get("__unassigned")!;
      row.expense += Number(e.amount || 0);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, profit: v.income - v.expense }))
      .filter((r) => r.gross || r.income || r.commission || r.expense)
      .sort((a, b) => b.profit - a.profit);
  }, [branches, txns, exps, branchOfAgent]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    gross: a.gross + r.gross, income: a.income + r.income, commission: a.commission + r.commission, expense: a.expense + r.expense, profit: a.profit + r.profit,
  }), { gross: 0, income: 0, commission: 0, expense: 0, profit: 0 }), [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Branch P&L</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="md:col-span-2 grid grid-cols-3 gap-2 self-end">
            <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground">Income</div><div className="font-bold">{inr(totals.income)}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground">Expense</div><div className="font-bold text-destructive">{inr(totals.expense)}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] text-muted-foreground">Profit</div><div className={`font-bold ${totals.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{inr(totals.profit)}</div></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Per-branch breakdown</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Branch</TableHead><TableHead>Gross Premium</TableHead><TableHead>Income (Co. Share)</TableHead>
              <TableHead>Commission Paid</TableHead><TableHead>Expenses</TableHead><TableHead>Profit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No data in range.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{inr(r.gross)}</TableCell>
                  <TableCell>{inr(r.income)}</TableCell>
                  <TableCell className="text-muted-foreground">{inr(r.commission)}</TableCell>
                  <TableCell className="text-destructive">{inr(r.expense)}</TableCell>
                  <TableCell>
                    <Badge variant={r.profit >= 0 ? "default" : "destructive"} className="gap-1">
                      {r.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {inr(r.profit)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
