import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeProps, rangeStart, rangeEnd, downloadCSV, CHART_COLORS } from "../utils";

export const LeadCallingReports = ({ range, customFrom, customTo }: DateRangeProps) => {
  const [dial, setDial] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = rangeStart(range, customFrom).toISOString();
      const until = rangeEnd(range, customTo).toISOString();
      const [d, p, l] = await Promise.all([
        (supabase as any).from("dial_logs").select("telecaller_id,connected,duration_seconds,clicked_at,call_type").gte("clicked_at", since).lte("clicked_at", until),
        (supabase as any).from("profiles").select("id,full_name"),
        (supabase as any).from("leads").select("status,assigned_telecaller,area_id,created_at").gte("created_at", since).lte("created_at", until),
      ]);
      setDial(d.data ?? []); setProfiles(p.data ?? []); setLeads(l.data ?? []);
    })();
  }, [range, customFrom, customTo]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name || id?.slice(0, 6) || "—";

  // Call Volume
  const callVolume = useMemo(() => {
    const m = new Map<string, { agent: string; total: number; connected: number; notPicked: number }>();
    dial.forEach((d) => {
      const key = d.telecaller_id;
      const e = m.get(key) || { agent: nameOf(key), total: 0, connected: 0, notPicked: 0 };
      e.total++;
      if (d.connected) e.connected++; else e.notPicked++;
      m.set(key, e);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [dial, profiles]);

  // Talk Time
  const talkTime = useMemo(() => {
    const m = new Map<string, { agent: string; total: number; calls: number }>();
    dial.filter((d) => d.connected).forEach((d) => {
      const key = d.telecaller_id;
      const e = m.get(key) || { agent: nameOf(key), total: 0, calls: 0 };
      e.total += Number(d.duration_seconds || 0);
      e.calls++;
      m.set(key, e);
    });
    return Array.from(m.values()).map((e) => ({
      agent: e.agent, totalSec: e.total, calls: e.calls,
      avgSec: e.calls ? Math.round(e.total / e.calls) : 0,
    })).sort((a, b) => b.avgSec - a.avgSec);
  }, [dial, profiles]);

  // Conversion
  const total = leads.length;
  const converted = leads.filter((l) => ["Done", "Converted", "Won"].includes(l.status)).length;
  const convRate = total ? ((converted / total) * 100).toFixed(1) : "0";

  // Disposal pie
  const disposal = useMemo(() => {
    const m: Record<string, number> = {};
    leads.forEach((l) => { m[l.status || "Unknown"] = (m[l.status || "Unknown"] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const fmtSec = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Call Volume Report</CardTitle><p className="text-xs text-muted-foreground mt-1">Agent-wise dial attempts: connected vs not picked</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`call-volume-${range}.csv`, callVolume)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={callVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="connected" stackId="a" fill={CHART_COLORS[2]} />
              <Bar dataKey="notPicked" stackId="a" fill={CHART_COLORS[6]} />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Total</TableHead><TableHead>Connected</TableHead><TableHead>Not Picked</TableHead></TableRow></TableHeader>
            <TableBody>{callVolume.map((r) => (
              <TableRow key={r.agent}><TableCell>{r.agent}</TableCell><TableCell>{r.total}</TableCell><TableCell>{r.connected}</TableCell><TableCell>{r.notPicked}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Talk Time Report</CardTitle><p className="text-xs text-muted-foreground mt-1">Total & average talk time per agent (connected calls only)</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`talk-time-${range}.csv`, talkTime)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={talkTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent" /><YAxis /><Tooltip />
              <Bar dataKey="avgSec" fill={CHART_COLORS[0]} name="Avg sec/call" />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Calls</TableHead><TableHead>Total Talk Time</TableHead><TableHead>Avg / Call</TableHead></TableRow></TableHeader>
            <TableBody>{talkTime.map((r) => (
              <TableRow key={r.agent}><TableCell>{r.agent}</TableCell><TableCell>{r.calls}</TableCell><TableCell>{fmtSec(r.totalSec)}</TableCell><TableCell>{fmtSec(r.avgSec)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lead Conversion</CardTitle><p className="text-xs text-muted-foreground">Conversion funnel from new leads to closed deals</p></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Total Leads</div><div className="text-2xl font-bold">{total}</div></div>
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Converted</div><div className="text-2xl font-bold text-primary">{converted}</div></div>
          <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Conversion %</div><div className="text-2xl font-bold">{convRate}%</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Disposal / Status Report</CardTitle><p className="text-xs text-muted-foreground mt-1">Distribution of lead dispositions</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`disposal-${range}.csv`, disposal)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={disposal} dataKey="value" nameKey="name" outerRadius={90} label>
                {disposal.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Count</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
            <TableBody>{disposal.map((r) => (
              <TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.value}</TableCell><TableCell>{total ? ((r.value / total) * 100).toFixed(1) : 0}%</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
