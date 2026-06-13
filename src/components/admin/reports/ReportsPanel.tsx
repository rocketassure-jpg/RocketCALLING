import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, IndianRupee, Download, PieChart as PieIcon, Activity } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Range = "7d" | "30d" | "90d" | "ytd";
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 71% 45%)", "hsl(45 93% 55%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)"];

const rangeStart = (r: Range) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === "7d") d.setDate(d.getDate() - 6);
  else if (r === "30d") d.setDate(d.getDate() - 29);
  else if (r === "90d") d.setDate(d.getDate() - 89);
  else if (r === "ytd") { d.setMonth(0); d.setDate(1); }
  return d;
};

const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const downloadCSV = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};

export const ReportsPanel = () => {
  const [range, setRange] = useState<Range>("30d");
  const [txns, setTxns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = rangeStart(range).toISOString();
      const [t, l, e, c] = await Promise.all([
        supabase.from("policy_transactions").select("premium_amount,commission_amount,policy_type,transaction_date,agent_id,broker_id").gte("transaction_date", since.slice(0, 10)),
        supabase.from("leads").select("status,policy_type,premium_amount,created_at,assigned_telecaller").gte("created_at", since),
        supabase.from("expenses").select("amount,category,expense_date").gte("expense_date", since.slice(0, 10)),
        supabase.from("claims").select("status,claim_amount,reported_date").gte("reported_date", since.slice(0, 10)),
      ]);
      setTxns(t.data ?? []); setLeads(l.data ?? []); setExpenses(e.data ?? []); setClaims(c.data ?? []);
    })();
  }, [range]);

  // Premium Collection over time
  const premiumTrend = useMemo(() => {
    const buckets: Record<string, { date: string; premium: number; commission: number }> = {};
    txns.forEach((t) => {
      const k = (t.transaction_date as string).slice(0, 10);
      if (!buckets[k]) buckets[k] = { date: k.slice(5), premium: 0, commission: 0 };
      buckets[k].premium += Number(t.premium_amount || 0);
      buckets[k].commission += Number(t.commission_amount || 0);
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [txns]);

  // Premium by Product
  const byProduct = useMemo(() => {
    const m: Record<string, number> = {};
    txns.forEach((t) => { m[t.policy_type] = (m[t.policy_type] || 0) + Number(t.premium_amount || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [txns]);

  // Lead conversion funnel
  const funnel = useMemo(() => {
    const total = leads.length;
    const interested = leads.filter((l) => ["Interested", "Follow-up"].includes(l.status)).length;
    const won = leads.filter((l) => l.status === "Done").length;
    const lost = leads.filter((l) => ["Not Interested", "Unsubscribed"].includes(l.status)).length;
    return [
      { stage: "New", count: total },
      { stage: "Interested", count: interested },
      { stage: "Won", count: won },
      { stage: "Lost", count: lost },
    ];
  }, [leads]);

  const conversionRate = leads.length > 0 ? ((leads.filter((l) => l.status === "Done").length / leads.length) * 100).toFixed(1) : "0";

  // P&L summary
  const totalPremium = txns.reduce((s, t) => s + Number(t.premium_amount || 0), 0);
  const totalCommission = txns.reduce((s, t) => s + Number(t.commission_amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalCommission - totalExpense;

  // Claims breakdown
  const claimStatus = useMemo(() => {
    const m: Record<string, number> = {};
    claims.forEach((c) => { m[c.status] = (m[c.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [claims]);

  // Expense by category
  const expByCat = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach((e) => { m[e.category || "Other"] = (m[e.category || "Other"] || 0) + Number(e.amount || 0); });
    return Object.entries(m).map(([category, amount]) => ({ category, amount }));
  }, [expenses]);

  const kpis = [
    { label: "Total Premium", value: fmtINR(totalPremium), icon: IndianRupee, color: "from-blue-500 to-blue-600" },
    { label: "Commission Earned", value: fmtINR(totalCommission), icon: TrendingUp, color: "from-green-500 to-emerald-600" },
    { label: "Net Profit", value: fmtINR(netProfit), icon: Activity, color: netProfit >= 0 ? "from-purple-500 to-fuchsia-600" : "from-red-500 to-rose-600" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: Users, color: "from-orange-500 to-red-600" },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Premium collection, conversion, P&L, claims & expenses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${k.color} p-4 text-white`}>
                <k.icon className="h-5 w-5 opacity-80" />
                <div className="mt-3 text-xs opacity-90">{k.label}</div>
                <div className="mt-1 text-2xl font-bold">{k.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="premium">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="premium"><BarChart3 className="mr-1 h-4 w-4" /> Premium</TabsTrigger>
          <TabsTrigger value="conversion"><TrendingUp className="mr-1 h-4 w-4" /> Conversion</TabsTrigger>
          <TabsTrigger value="pnl"><Activity className="mr-1 h-4 w-4" /> P&L</TabsTrigger>
          <TabsTrigger value="claims"><PieIcon className="mr-1 h-4 w-4" /> Claims</TabsTrigger>
          <TabsTrigger value="expenses"><IndianRupee className="mr-1 h-4 w-4" /> Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="premium" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Premium Collection Trend</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("premium-trend.csv", premiumTrend)}><Download className="mr-1 h-4 w-4" /> CSV</Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={premiumTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="premium" stroke="hsl(var(--primary))" strokeWidth={2} name="Premium" />
                  <Line type="monotone" dataKey="commission" stroke="hsl(142 71% 45%)" strokeWidth={2} name="Commission" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Premium by Product</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.name}: ${fmtINR(e.value)}`}>
                    {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtINR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lead Conversion Funnel</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("funnel.csv", funnel)}><Download className="mr-1 h-4 w-4" /> CSV</Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {funnel.map((f) => (
                  <div key={f.stage} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{f.stage}</div>
                    <div className="text-2xl font-bold">{f.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Profit & Loss Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between border-b py-2"><span>Total Premium Collected</span><span className="font-mono">{fmtINR(totalPremium)}</span></div>
                <div className="flex justify-between border-b py-2 text-success"><span>Commission Earned</span><span className="font-mono">+ {fmtINR(totalCommission)}</span></div>
                <div className="flex justify-between border-b py-2 text-destructive"><span>Operating Expenses</span><span className="font-mono">- {fmtINR(totalExpense)}</span></div>
                <div className={`flex justify-between py-3 text-lg font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  <span>Net Profit</span><span className="font-mono">{fmtINR(netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Claims by Status</CardTitle></CardHeader>
            <CardContent>
              {claimStatus.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No claims in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={claimStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}`}>
                      {claimStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expenses by Category</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("expenses.csv", expByCat)}><Download className="mr-1 h-4 w-4" /> CSV</Button>
            </CardHeader>
            <CardContent>
              {expByCat.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No expenses in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expByCat}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtINR(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
