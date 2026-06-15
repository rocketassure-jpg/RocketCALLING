import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DateRangeProps, rangeStart, rangeEnd, downloadCSV, fmtINR, CHART_COLORS } from "../utils";

export const PolicyProductReports = ({ range, customFrom, customTo }: DateRangeProps) => {
  const [txns, setTxns] = useState<any[]>([]);
  const [motor, setMotor] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = rangeStart(range, customFrom).toISOString().slice(0, 10);
      const until = rangeEnd(range, customTo).toISOString().slice(0, 10);
      const [t, m] = await Promise.all([
        (supabase as any).from("policy_transactions").select("policy_type,premium_amount,transaction_date,insurer_id,insurers(name)").gte("transaction_date", since).lte("transaction_date", until),
        (supabase as any).from("motor_policies").select("vehicle_type,gross_premium,start_date").gte("start_date", since).lte("start_date", until),
      ]);
      setTxns(t.data ?? []); setMotor(m.data ?? []);
    })();
  }, [range, customFrom, customTo]);

  const categoryWise = useMemo(() => {
    const m: Record<string, { count: number; premium: number }> = {};
    txns.forEach((t) => {
      const k = t.policy_type || "Other";
      if (!m[k]) m[k] = { count: 0, premium: 0 };
      m[k].count++; m[k].premium += Number(t.premium_amount || 0);
    });
    return Object.entries(m).map(([type, v]) => ({ type, ...v }));
  }, [txns]);

  const vehicleType = useMemo(() => {
    const m: Record<string, { count: number; premium: number }> = {};
    motor.forEach((p) => {
      const k = p.vehicle_type || "Other";
      if (!m[k]) m[k] = { count: 0, premium: 0 };
      m[k].count++; m[k].premium += Number(p.gross_premium || 0);
    });
    return Object.entries(m).map(([type, v]) => ({ type, ...v }));
  }, [motor]);

  const insurerDist = useMemo(() => {
    const m: Record<string, { count: number; premium: number }> = {};
    txns.forEach((t) => {
      const k = t.insurers?.name || "Unknown";
      if (!m[k]) m[k] = { count: 0, premium: 0 };
      m[k].count++; m[k].premium += Number(t.premium_amount || 0);
    });
    return Object.entries(m).map(([insurer, v]) => ({ insurer, ...v })).sort((a, b) => b.premium - a.premium).slice(0, 10);
  }, [txns]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Category-Wise Business</CardTitle><p className="text-xs text-muted-foreground mt-1">Premium and policy count per category</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`category-${range}.csv`, categoryWise)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryWise} dataKey="premium" nameKey="type" outerRadius={90} label>
                {categoryWise.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Policies</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
            <TableBody>{categoryWise.map((r) => (
              <TableRow key={r.type}><TableCell>{r.type}</TableCell><TableCell>{r.count}</TableCell><TableCell>{fmtINR(r.premium)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Vehicle Type Report (Motor)</CardTitle><p className="text-xs text-muted-foreground mt-1">Motor policy distribution by vehicle type</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`vehicle-type.csv`, vehicleType)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={vehicleType}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="count" fill={CHART_COLORS[0]} name="Policies" />
              <Bar dataKey="premium" fill={CHART_COLORS[2]} name="Premium ₹" />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle Type</TableHead><TableHead>Count</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
            <TableBody>{vehicleType.map((r) => (
              <TableRow key={r.type}><TableCell>{r.type}</TableCell><TableCell>{r.count}</TableCell><TableCell>{fmtINR(r.premium)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Insurer / Company Distribution</CardTitle><p className="text-xs text-muted-foreground mt-1">Top 10 insurers by premium</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`insurers.csv`, insurerDist)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={insurerDist} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="insurer" type="category" width={120} /><Tooltip />
              <Bar dataKey="premium" fill={CHART_COLORS[4]} />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Insurer</TableHead><TableHead>Policies</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
            <TableBody>{insurerDist.map((r) => (
              <TableRow key={r.insurer}><TableCell>{r.insurer}</TableCell><TableCell>{r.count}</TableCell><TableCell>{fmtINR(r.premium)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
