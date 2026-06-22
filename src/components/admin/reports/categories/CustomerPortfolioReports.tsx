import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Star, Sparkles, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DateRangeProps, downloadCSV, fmtINR, CHART_COLORS } from "../utils";

export const CustomerPortfolioReports = (_p: DateRangeProps) => {
  const [c360, setC360] = useState<any[]>([]);
  const [crossSell, setCrossSell] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [v, x] = await Promise.all([
        (supabase as any).from("v_customer_360").select("*").order("lifetime_premium", { ascending: false }).limit(500),
        (supabase as any).from("cross_sell_suggestions").select("customer_id,missing_category,score,reason,customers(full_name,mobile)").order("score", { ascending: false }).limit(500),
      ]);
      setC360(v.data ?? []);
      setCrossSell(x.data ?? []);
    })();
  }, []);

  const byStage = useMemo(() => {
    const m: Record<string, number> = {};
    c360.forEach((c) => { const k = c.lifecycle_stage || "lead"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [c360]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    crossSell.forEach((s) => { m[s.missing_category] = (m[s.missing_category] || 0) + 1; });
    return Object.entries(m).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }, [crossSell]);

  const top10 = useMemo(() => c360.slice(0, 10), [c360]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" /> Customers</div><div className="text-2xl font-bold">{c360.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" /> Multi-product</div><div className="text-2xl font-bold">{c360.filter((c) => (c.products_count || 0) >= 2).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Star className="h-4 w-4" /> Avg Value Score</div><div className="text-2xl font-bold">{c360.length ? Math.round(c360.reduce((s, c) => s + Number(c.value_score || 0), 0) / c360.length) : 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-4 w-4" /> Cross-sell Opps</div><div className="text-2xl font-bold">{crossSell.length}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Lifecycle Stage</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStage} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byStage.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Cross-sell by Missing Category</CardTitle>
            <Button size="sm" variant="outline" onClick={() => downloadCSV("cross_sell.csv", crossSell.map((s) => ({ customer: s.customers?.full_name, mobile: s.customers?.mobile, category: s.missing_category, score: s.score, reason: s.reason })))}><Download className="h-3 w-3 mr-1" /> CSV</Button>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Top 10 Customers by Lifetime Premium</CardTitle>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("customer_portfolio.csv", c360)}><Download className="h-3 w-3 mr-1" /> Export All</Button>
        </CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Mobile</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Products</TableHead><TableHead className="text-right">Lifetime Premium</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {top10.map((c) => (
                <TableRow key={c.customer_id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.mobile}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{(c.lifecycle_stage || "lead").replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right">{c.products_count || 0}</TableCell>
                  <TableCell className="text-right">{fmtINR(Number(c.lifetime_premium || 0))}</TableCell>
                  <TableCell className="text-right">{c.value_score ?? 0}</TableCell>
                </TableRow>
              ))}
              {!top10.length && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No customers yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
