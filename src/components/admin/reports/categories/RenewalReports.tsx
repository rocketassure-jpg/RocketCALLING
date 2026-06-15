import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DateRangeProps, downloadCSV, fmtINR, CHART_COLORS } from "../utils";

export const RenewalReports = ({ range }: DateRangeProps) => {
  const [daysAhead, setDaysAhead] = useState("30");
  const [leads, setLeads] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [l, t, c] = await Promise.all([
        (supabase as any).from("leads").select("id,customer_name,phone_number,policy_type,policy_expiry_date,premium_amount,created_at,status,assigned_telecaller"),
        (supabase as any).from("policy_transactions").select("policy_type,premium_amount,transaction_date,customer_id,policy_number"),
        (supabase as any).from("call_logs").select("lead_id,status,called_at"),
      ]);
      setLeads(l.data ?? []); setTxns(t.data ?? []); setCallLogs(c.data ?? []);
    })();
  }, []);

  // Upcoming Renewals
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + Number(daysAhead));
    return leads.filter((l) => {
      if (!l.policy_expiry_date) return false;
      const d = new Date(l.policy_expiry_date);
      return d >= today && d <= end;
    }).map((l) => ({
      customer: l.customer_name, phone: l.phone_number, policy: l.policy_type,
      expiry: l.policy_expiry_date,
      daysLeft: Math.ceil((new Date(l.policy_expiry_date).getTime() - today.getTime()) / 86400000),
      premium: Number(l.premium_amount || 0),
    }));
  }, [leads, daysAhead]);

  const upcomingByType = useMemo(() => {
    const m: Record<string, { count: number; premium: number }> = {};
    upcoming.forEach((r) => {
      const k = r.policy || "Other";
      if (!m[k]) m[k] = { count: 0, premium: 0 };
      m[k].count++; m[k].premium += r.premium;
    });
    return Object.entries(m).map(([type, v]) => ({ type, ...v }));
  }, [upcoming]);

  // Renewal Conversion (past N days due → matched txn within window)
  const renewalConv = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - Number(daysAhead));
    const due = leads.filter((l) => l.policy_expiry_date && new Date(l.policy_expiry_date) >= start && new Date(l.policy_expiry_date) <= today);
    const byType: Record<string, { due: number; renewed: number }> = {};
    due.forEach((l) => {
      const k = l.policy_type || "Other";
      if (!byType[k]) byType[k] = { due: 0, renewed: 0 };
      byType[k].due++;
      const renewed = txns.some((t) => {
        if (t.policy_type !== l.policy_type) return false;
        const td = new Date(t.transaction_date);
        return td >= start && td <= today;
      });
      if (renewed) byType[k].renewed++;
    });
    return Object.entries(byType).map(([type, v]) => ({
      type, due: v.due, renewed: v.renewed,
      pct: v.due ? ((v.renewed / v.due) * 100).toFixed(1) : "0",
    }));
  }, [leads, txns, daysAhead]);

  // Pipeline Velocity
  const velocity = useMemo(() => {
    const firstDoneByLead = new Map<string, string>();
    callLogs.filter((c) => c.status === "Done").forEach((c) => {
      const prev = firstDoneByLead.get(c.lead_id);
      if (!prev || c.called_at < prev) firstDoneByLead.set(c.lead_id, c.called_at);
    });
    const byType: Record<string, { sum: number; n: number }> = {};
    leads.forEach((l) => {
      const done = firstDoneByLead.get(l.id);
      if (!done) return;
      const days = (new Date(done).getTime() - new Date(l.created_at).getTime()) / 86400000;
      const k = l.policy_type || "Other";
      if (!byType[k]) byType[k] = { sum: 0, n: 0 };
      byType[k].sum += days; byType[k].n++;
    });
    return Object.entries(byType).map(([type, v]) => ({ type, avgDays: v.n ? (v.sum / v.n).toFixed(1) : "0", count: v.n }));
  }, [leads, callLogs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Upcoming Renewals</CardTitle><p className="text-xs text-muted-foreground mt-1">Policies expiring within selected window</p></div>
          <div className="flex items-center gap-2">
            <Select value={daysAhead} onValueChange={setDaysAhead}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(`upcoming-renewals.csv`, upcoming)}><Download className="h-4 w-4" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={upcomingByType}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="count" fill={CHART_COLORS[0]} name="Policies" />
              <Bar dataKey="premium" fill={CHART_COLORS[2]} name="Premium ₹" />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Policy</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
            <TableBody>{upcoming.slice(0, 50).map((r, i) => (
              <TableRow key={i}><TableCell>{r.customer}</TableCell><TableCell className="font-mono text-xs">{r.phone}</TableCell><TableCell>{r.policy}</TableCell><TableCell>{r.expiry}</TableCell><TableCell>{r.daysLeft}</TableCell><TableCell>{fmtINR(r.premium)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Renewal Conversion Rate</CardTitle><p className="text-xs text-muted-foreground mt-1">% of due renewals converted (last {daysAhead} days)</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`renewal-conv.csv`, renewalConv)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Due</TableHead><TableHead>Renewed</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
            <TableBody>{renewalConv.map((r) => (
              <TableRow key={r.type}><TableCell>{r.type}</TableCell><TableCell>{r.due}</TableCell><TableCell>{r.renewed}</TableCell><TableCell>{r.pct}%</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Pipeline Velocity</CardTitle><p className="text-xs text-muted-foreground mt-1">Avg days: New Lead → Policy Issued</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`velocity.csv`, velocity)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Policy Type</TableHead><TableHead>Avg Days</TableHead><TableHead>Sample Size</TableHead></TableRow></TableHeader>
            <TableBody>{velocity.map((r) => (
              <TableRow key={r.type}><TableCell>{r.type}</TableCell><TableCell>{r.avgDays}</TableCell><TableCell>{r.count}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
