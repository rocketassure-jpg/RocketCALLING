import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DateRangeProps, rangeStart, rangeEnd, downloadCSV, fmtINR, CHART_COLORS } from "../utils";
import { BranchPnL } from "@/components/admin/reports/BranchPnL";

export const FinancialReports = ({ range, customFrom, customTo }: DateRangeProps) => {
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");
  const [txns, setTxns] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = rangeStart(range, customFrom).toISOString().slice(0, 10);
      const until = rangeEnd(range, customTo).toISOString().slice(0, 10);
      const [t, b, e] = await Promise.all([
        (supabase as any).from("policy_transactions").select("premium_amount,commission_amount,agent_payout,transaction_date,broker_id,brokers(name)").gte("transaction_date", since).lte("transaction_date", until),
        (supabase as any).from("brokers").select("id,name"),
        (supabase as any).from("expenses").select("amount,expense_date").gte("expense_date", since).lte("expense_date", until),
      ]);
      setTxns(t.data ?? []); setBrokers(b.data ?? []); setExpenses(e.data ?? []);
    })();
  }, [range, customFrom, customTo]);

  // Premium trend
  const trend = useMemo(() => {
    const buckets: Record<string, { date: string; premium: number; commission: number }> = {};
    txns.forEach((t) => {
      const d = new Date(t.transaction_date);
      let key: string;
      if (bucket === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else if (bucket === "week") {
        const wk = new Date(d); wk.setDate(d.getDate() - d.getDay());
        key = wk.toISOString().slice(0, 10);
      } else key = t.transaction_date;
      if (!buckets[key]) buckets[key] = { date: key, premium: 0, commission: 0 };
      buckets[key].premium += Number(t.premium_amount || 0);
      buckets[key].commission += Number(t.commission_amount || 0);
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [txns, bucket]);

  const totalPremium = txns.reduce((s, t) => s + Number(t.premium_amount || 0), 0);

  // Broker & Payouts
  const brokerPayouts = useMemo(() => {
    const m: Record<string, { name: string; commission: number; payout: number; count: number }> = {};
    txns.forEach((t) => {
      const name = t.brokers?.name || brokers.find((b) => b.id === t.broker_id)?.name || "Direct";
      if (!m[name]) m[name] = { name, commission: 0, payout: 0, count: 0 };
      m[name].commission += Number(t.commission_amount || 0);
      m[name].payout += Number(t.agent_payout || 0);
      m[name].count++;
    });
    return Object.values(m).sort((a, b) => b.commission - a.commission);
  }, [txns, brokers]);

  // P&L summary
  const totalCommission = txns.reduce((s, t) => s + Number(t.commission_amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalCommission - totalExpense;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Premium Collected</CardTitle><p className="text-xs text-muted-foreground mt-1">Total premium: {fmtINR(totalPremium)} • Commission: {fmtINR(totalCommission)}</p></div>
          <div className="flex items-center gap-2">
            <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(`premium-trend-${range}.csv`, trend)}><Download className="h-4 w-4" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
              <Line type="monotone" dataKey="premium" stroke={CHART_COLORS[0]} strokeWidth={2} />
              <Line type="monotone" dataKey="commission" stroke={CHART_COLORS[2]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Broker & Payouts Report</CardTitle><p className="text-xs text-muted-foreground mt-1">Commission and payouts per broker</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`broker-payouts.csv`, brokerPayouts)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Broker / Agent</TableHead><TableHead>Policies</TableHead><TableHead>Commission</TableHead><TableHead>Payout</TableHead></TableRow></TableHeader>
            <TableBody>{brokerPayouts.map((r) => (
              <TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.count}</TableCell><TableCell>{fmtINR(r.commission)}</TableCell><TableCell>{fmtINR(r.payout)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>P&L Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Commission</div><div className="text-2xl font-bold">{fmtINR(totalCommission)}</div></div>
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Expenses</div><div className="text-2xl font-bold">{fmtINR(totalExpense)}</div></div>
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Net Profit</div><div className={`text-2xl font-bold ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>{fmtINR(netProfit)}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Branch P&L</CardTitle></CardHeader>
        <CardContent><BranchPnL /></CardContent>
      </Card>
    </div>
  );
};
