import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRangeProps, rangeStart, rangeEnd, downloadCSV, CHART_COLORS } from "../utils";
import { PerformancePanel } from "@/components/admin/PerformancePanel";

const TERMINAL = ["Done", "Converted", "Won", "Not Interested", "Closed", "Unsubscribed"];

export const ProductivityReports = ({ range, customFrom, customTo }: DateRangeProps) => {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [dial, setDial] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = rangeStart(range, customFrom).toISOString();
      const until = rangeEnd(range, customTo).toISOString();
      const [c, l, b, d, p] = await Promise.all([
        (supabase as any).from("call_logs").select("lead_id,telecaller_id,status,called_at").gte("called_at", since).lte("called_at", until),
        (supabase as any).from("leads").select("id,status,assigned_telecaller,follow_up_date,customer_name,phone_number,policy_type"),
        (supabase as any).from("break_logs").select("user_id,started_at,ended_at").gte("started_at", since).lte("started_at", until),
        (supabase as any).from("dial_logs").select("telecaller_id,clicked_at").gte("clicked_at", since).lte("clicked_at", until),
        (supabase as any).from("profiles").select("id,full_name"),
      ]);
      setCallLogs(c.data ?? []); setLeads(l.data ?? []); setBreaks(b.data ?? []); setDial(d.data ?? []); setProfiles(p.data ?? []);
    })();
  }, [range, customFrom, customTo]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name || id?.slice(0, 6) || "—";

  // FCR
  const fcr = useMemo(() => {
    const byLead = new Map<string, any[]>();
    callLogs.forEach((c) => { const arr = byLead.get(c.lead_id) || []; arr.push(c); byLead.set(c.lead_id, arr); });
    const perAgent = new Map<string, { contacted: number; fcr: number }>();
    leads.forEach((l) => {
      const logs = byLead.get(l.id) || [];
      if (!logs.length) return;
      const agent = l.assigned_telecaller || logs[0].telecaller_id;
      const e = perAgent.get(agent) || { contacted: 0, fcr: 0 };
      e.contacted++;
      if (logs.length === 1 && TERMINAL.includes(l.status)) e.fcr++;
      perAgent.set(agent, e);
    });
    return Array.from(perAgent.entries()).map(([id, v]) => ({
      agent: nameOf(id), contacted: v.contacted, fcr: v.fcr,
      pct: v.contacted ? ((v.fcr / v.contacted) * 100).toFixed(1) : "0",
    })).sort((a, b) => Number(b.pct) - Number(a.pct));
  }, [callLogs, leads, profiles]);

  // Agent activity
  const activity = useMemo(() => {
    const agents = new Map<string, { breakSec: number; first: string | null; last: string | null }>();
    breaks.forEach((b) => {
      const e = agents.get(b.user_id) || { breakSec: 0, first: null, last: null };
      if (b.started_at && b.ended_at) e.breakSec += Math.floor((new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 1000);
      agents.set(b.user_id, e);
    });
    dial.forEach((d) => {
      const e = agents.get(d.telecaller_id) || { breakSec: 0, first: null, last: null };
      if (!e.first || d.clicked_at < e.first) e.first = d.clicked_at;
      if (!e.last || d.clicked_at > e.last) e.last = d.clicked_at;
      agents.set(d.telecaller_id, e);
    });
    return Array.from(agents.entries()).map(([id, v]) => {
      const activeMs = v.first && v.last ? (new Date(v.last).getTime() - new Date(v.first).getTime()) : 0;
      const netSec = Math.max(0, Math.floor(activeMs / 1000) - v.breakSec);
      return {
        agent: nameOf(id),
        login: v.first ? new Date(v.first).toLocaleString() : "—",
        logout: v.last ? new Date(v.last).toLocaleString() : "—",
        breakMin: Math.floor(v.breakSec / 60),
        activeHours: (netSec / 3600).toFixed(1),
      };
    });
  }, [breaks, dial, profiles]);

  // Missed follow-ups
  const missed = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter((l) => l.follow_up_date && l.follow_up_date < today && !TERMINAL.includes(l.status))
      .map((l) => ({
        customer: l.customer_name,
        phone: l.phone_number,
        agent: nameOf(l.assigned_telecaller),
        followUp: l.follow_up_date,
        daysOverdue: Math.floor((new Date(today).getTime() - new Date(l.follow_up_date).getTime()) / 86400000),
        policy: l.policy_type,
      }));
  }, [leads, profiles]);

  const missedByAgent = useMemo(() => {
    const m: Record<string, number> = {};
    missed.forEach((r) => { m[r.agent] = (m[r.agent] || 0) + 1; });
    return Object.entries(m).map(([agent, count]) => ({ agent, count }));
  }, [missed]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>First Call Resolution (FCR)</CardTitle><p className="text-xs text-muted-foreground mt-1">% of leads resolved on the first call</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`fcr-${range}.csv`, fcr)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Contacted</TableHead><TableHead>FCR</TableHead><TableHead>FCR %</TableHead></TableRow></TableHeader>
            <TableBody>{fcr.map((r) => (
              <TableRow key={r.agent}><TableCell>{r.agent}</TableCell><TableCell>{r.contacted}</TableCell><TableCell>{r.fcr}</TableCell><TableCell>{r.pct}%</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Agent Login / Activity</CardTitle><p className="text-xs text-muted-foreground mt-1">Derived from first/last activity and break logs</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`activity-${range}.csv`, activity)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>First Activity</TableHead><TableHead>Last Activity</TableHead><TableHead>Break (min)</TableHead><TableHead>Net Active (h)</TableHead></TableRow></TableHeader>
            <TableBody>{activity.map((r) => (
              <TableRow key={r.agent}><TableCell>{r.agent}</TableCell><TableCell className="text-xs">{r.login}</TableCell><TableCell className="text-xs">{r.logout}</TableCell><TableCell>{r.breakMin}</TableCell><TableCell>{r.activeHours}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Missed Follow-ups / Callbacks</CardTitle><p className="text-xs text-muted-foreground mt-1">Overdue follow-ups not in a terminal status</p></div>
          <Button size="sm" variant="outline" onClick={() => downloadCSV(`missed-followups.csv`, missed)}><Download className="h-4 w-4" /> CSV</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={missedByAgent}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="agent" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS[6]} />
            </BarChart>
          </ResponsiveContainer>
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Agent</TableHead><TableHead>Follow-up</TableHead><TableHead>Days Overdue</TableHead><TableHead>Policy</TableHead></TableRow></TableHeader>
            <TableBody>{missed.slice(0, 50).map((r, i) => (
              <TableRow key={i}><TableCell>{r.customer}</TableCell><TableCell className="font-mono text-xs">{r.phone}</TableCell><TableCell>{r.agent}</TableCell><TableCell>{r.followUp}</TableCell><TableCell>{r.daysOverdue}</TableCell><TableCell>{r.policy}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Performance Leaderboard</CardTitle></CardHeader>
        <CardContent><PerformancePanel /></CardContent>
      </Card>
    </div>
  );
};
