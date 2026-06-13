import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, Coffee, UserX,
  Phone, CheckCircle2, Clock, PhoneOff,
  Sparkles, ThumbsUp, MessageSquare, FileText,
  Handshake, Trophy, Flame, ThumbsDown, ArrowUpRight, CheckSquare,
  Briefcase, Calendar, TrendingUp, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

type Range = "today" | "week" | "month";

const startOfRange = (r: Range) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === "week") d.setDate(d.getDate() - 6);
  if (r === "month") d.setDate(d.getDate() - 29);
  return d;
};

const StatCard = ({ icon: Icon, label, value, accent = "border-l-primary" }: {
  icon: any; label: string; value: number | string; accent?: string;
}) => (
  <div
    className={`group flex items-center gap-2 sm:gap-3 rounded-lg border border-border/40 border-l-[3px] ${accent} bg-card p-2.5 sm:p-3 shadow-card-pop cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-l-[6px] hover:bg-accent/5`}
  >
    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
    <div className="min-w-0 flex-1">
      <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div className="text-base sm:text-lg md:text-xl font-extrabold tabular-nums transition-colors group-hover:text-primary">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </div>
    </div>
  </div>
);

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6", "#f97316", "#94a3b8"];

export const AdminOverviewPanel = () => {
  const [range, setRange] = useState<Range>("today");
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState({ total: 0, active: 0, onBreak: 0, offline: 0 });
  const [calls, setCalls] = useState({ total: 0, done: 0, remaining: 0, notPicked: 0 });
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [campaigns, setCampaigns] = useState({ total: 0, active: 0, completed: 0, leads: 0 });
  const [business, setBusiness] = useState({ total: 0, assigned: 0, unassigned: 0, conversion: 0 });
  const [perTelecaller, setPerTelecaller] = useState<{ name: string; calls: number; interested: number; converted: number; last: string | null }[]>([]);
  const [trend, setTrend] = useState<{ day: string; calls: number }[]>([]);
  const [dispoSlice, setDispoSlice] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const since = startOfRange(range).toISOString();
      const sinceDay = startOfRange(range).toISOString().slice(0, 10);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const breakCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // active in last 30 min

      const [
        rolesRes, breaksRes, recentCallsRes,
        callsInRangeRes, leadsCountRes,
        pipelineRes, campaignsRes,
        leadsAssignedRes, leadsUnassignedRes,
        convertedRes, calledRes,
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id,role,profiles(full_name,is_active)").eq("role", "telecaller"),
        supabase.from("break_logs").select("user_id,started_at,ended_at").is("ended_at", null),
        supabase.from("call_logs").select("telecaller_id,called_at").gte("called_at", breakCutoff),
        supabase.from("call_logs").select("id,status,telecaller_id,called_at", { count: "exact" }).gte("called_at", since),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("status"),
        supabase.from("leads").select("campaign_name,deadline"),
        supabase.from("leads").select("id", { count: "exact", head: true }).not("assigned_telecaller", "is", null),
        supabase.from("leads").select("id", { count: "exact", head: true }).is("assigned_telecaller", null),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "Converted"),
        supabase.from("call_logs").select("id", { count: "exact", head: true }).gte("called_at", since),
      ]);
      if (!mounted) return;

      // Team
      const tcRoles = (rolesRes.data ?? []) as any[];
      const tcIds = new Set(tcRoles.map((r) => r.user_id));
      const activeBreakIds = new Set(((breaksRes.data ?? []) as any[]).map((b) => b.user_id));
      const recentlyActive = new Set(((recentCallsRes.data ?? []) as any[]).map((c) => c.telecaller_id));
      const onBreak = [...activeBreakIds].filter((id) => tcIds.has(id)).length;
      const active = [...recentlyActive].filter((id) => tcIds.has(id) && !activeBreakIds.has(id)).length;
      setTeam({ total: tcIds.size, active, onBreak, offline: Math.max(tcIds.size - active - onBreak, 0) });

      // Calls
      const callRows = (callsInRangeRes.data ?? []) as any[];
      const done = callRows.filter((c) => ["Converted", "Done", "Interested", "Quote Sent", "Premium Quoted", "Negotiation"].includes(c.status)).length;
      const notPicked = callRows.filter((c) => c.status === "Not Picked").length;
      setCalls({ total: callRows.length, done, remaining: Math.max((leadsCountRes.count ?? 0) - callRows.length, 0), notPicked });

      // Pipeline
      const pipe: Record<string, number> = {};
      ((pipelineRes.data ?? []) as any[]).forEach((l) => { pipe[l.status] = (pipe[l.status] ?? 0) + 1; });
      setPipeline(pipe);

      // Campaigns
      const campRows = ((campaignsRes.data ?? []) as any[]).filter((c) => c.campaign_name);
      const campSet = new Map<string, { active: boolean; leads: number }>();
      campRows.forEach((c) => {
        const cur = campSet.get(c.campaign_name) ?? { active: false, leads: 0 };
        cur.leads += 1;
        if (!c.deadline || c.deadline >= sinceDay) cur.active = true;
        campSet.set(c.campaign_name, cur);
      });
      const campList = [...campSet.values()];
      setCampaigns({
        total: campList.length,
        active: campList.filter((c) => c.active).length,
        completed: campList.filter((c) => !c.active).length,
        leads: campRows.length,
      });

      // Business
      const total = leadsCountRes.count ?? 0;
      const assigned = leadsAssignedRes.count ?? 0;
      const unassigned = leadsUnassignedRes.count ?? 0;
      const converted = convertedRes.count ?? 0;
      const called = calledRes.count ?? 0;
      setBusiness({ total, assigned, unassigned, conversion: called ? Math.round((converted / called) * 1000) / 10 : 0 });

      // Per-telecaller leaderboard
      const profMap = new Map(tcRoles.map((r) => [r.user_id, r.profiles?.full_name ?? r.user_id.slice(0, 6)]));
      const lb: Record<string, { name: string; calls: number; interested: number; converted: number; last: string | null }> = {};
      tcRoles.forEach((r) => { lb[r.user_id] = { name: profMap.get(r.user_id) ?? "—", calls: 0, interested: 0, converted: 0, last: null }; });
      callRows.forEach((c) => {
        const row = lb[c.telecaller_id]; if (!row) return;
        row.calls += 1;
        if (c.status === "Interested") row.interested += 1;
        if (c.status === "Converted") row.converted += 1;
        if (!row.last || c.called_at > row.last) row.last = c.called_at;
      });
      setPerTelecaller(Object.values(lb).sort((a, b) => b.calls - a.calls));

      // Trend last 30 days
      const trend30: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        trend30[d.toISOString().slice(5, 10)] = 0;
      }
      const trendStart = new Date(); trendStart.setHours(0, 0, 0, 0); trendStart.setDate(trendStart.getDate() - 29);
      const { data: tr } = await supabase.from("call_logs").select("called_at").gte("called_at", trendStart.toISOString());
      ((tr ?? []) as any[]).forEach((r) => {
        const key = new Date(r.called_at).toISOString().slice(5, 10);
        if (trend30[key] !== undefined) trend30[key] += 1;
      });
      setTrend(Object.entries(trend30).map(([day, calls]) => ({ day, calls })));

      // Disposition pie (in range)
      const dispoCount: Record<string, number> = {};
      callRows.forEach((c) => { dispoCount[c.status] = (dispoCount[c.status] ?? 0) + 1; });
      setDispoSlice(Object.entries(dispoCount).map(([name, value]) => ({ name, value })));

      setLoading(false);
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(iv); };
  }, [range]);

  const pipelineCards = useMemo(() => ([
    { key: "New",                icon: Sparkles,     accent: "border-l-warning" },
    { key: "Interested",         icon: ThumbsUp,     accent: "border-l-success" },
    { key: "Follow-up",          icon: MessageSquare, accent: "border-l-warning" },
    { key: "Quote Sent",         icon: FileText,     accent: "border-l-accent" },
    { key: "Negotiation",        icon: Handshake,    accent: "border-l-warning" },
    { key: "Converted",          icon: Trophy,       accent: "border-l-success" },
    { key: "Not Interested",     icon: ThumbsDown,   accent: "border-l-destructive" },
    { key: "Transfer to Senior", icon: ArrowUpRight, accent: "border-l-accent" },
    { key: "Done",               icon: CheckSquare,  accent: "border-l-primary" },
  ]), []);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Business Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time team performance &amp; lead pipeline</p>
        </div>
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {(["today", "week", "month"] as Range[]).map((r) => (
            <Button
              key={r} size="sm"
              variant={range === r ? "hero" : "ghost"}
              onClick={() => setRange(r)}
              className="h-8 rounded-full px-3 text-xs"
            >
              {r === "today" ? "Today" : r === "week" ? "7 Days" : "30 Days"}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
        </div>
      )}

      {/* Row 1 — Team */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Team</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard icon={Users}     label="Telecallers"  value={team.total}  accent="border-l-primary" />
          <StatCard icon={UserCheck} label="Active Today" value={team.active} accent="border-l-success" />
          <StatCard icon={Coffee}    label="On Break"     value={team.onBreak} accent="border-l-warning" />
          <StatCard icon={UserX}     label="Offline"      value={team.offline} accent="border-l-muted-foreground" />
        </div>
      </div>

      {/* Row 2 — Calls */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Calls ({range})</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard icon={Phone}        label="Total Calls"   value={calls.total}     accent="border-l-primary" />
          <StatCard icon={CheckCircle2} label="Done"          value={calls.done}      accent="border-l-success" />
          <StatCard icon={Clock}        label="Remaining"     value={calls.remaining} accent="border-l-warning" />
          <StatCard icon={PhoneOff}     label="Not Picked"    value={calls.notPicked} accent="border-l-destructive" />
        </div>
      </div>

      {/* Row 3 — Pipeline */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pipeline</div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {pipelineCards.map((p) => (
            <StatCard key={p.key} icon={p.icon} label={p.key} value={pipeline[p.key] ?? 0} accent={p.accent} />
          ))}
        </div>
      </div>

      {/* Row 4 — Campaigns */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Campaigns</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard icon={Briefcase}  label="Total Campaigns" value={campaigns.total}     accent="border-l-primary" />
          <StatCard icon={Flame}      label="Active"          value={campaigns.active}    accent="border-l-warning" />
          <StatCard icon={CheckSquare} label="Completed"       value={campaigns.completed} accent="border-l-success" />
          <StatCard icon={Users}      label="Leads in Camps." value={campaigns.leads}     accent="border-l-accent" />
        </div>
      </div>

      {/* Row 5 — Business */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Business Summary</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard icon={Briefcase}  label="Total Leads"   value={business.total}      accent="border-l-primary" />
          <StatCard icon={UserCheck}  label="Assigned"      value={business.assigned}   accent="border-l-success" />
          <StatCard icon={UserX}      label="Unassigned"    value={business.unassigned} accent="border-l-warning" />
          <StatCard icon={TrendingUp} label="Conversion %"  value={`${business.conversion}%`} accent="border-l-accent" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Calls per Telecaller</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perTelecaller.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Call Volume (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Disposition Breakdown ({range})</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dispoSlice} dataKey="value" nameKey="name" outerRadius={90} label>
                  {dispoSlice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Telecaller Leaderboard</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-right">Calls</th>
                <th className="p-2 text-right">Interested</th>
                <th className="p-2 text-right">Converted</th>
                <th className="p-2 text-left">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {perTelecaller.map((t, i) => (
                <tr key={t.name + i} className="border-t">
                  <td className="p-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{t.name}</td>
                  <td className="p-2 text-right tabular-nums">{t.calls}</td>
                  <td className="p-2 text-right tabular-nums"><Badge variant="outline" className="bg-success/10">{t.interested}</Badge></td>
                  <td className="p-2 text-right tabular-nums"><Badge variant="outline" className="bg-primary/10">{t.converted}</Badge></td>
                  <td className="p-2 text-xs text-muted-foreground">{t.last ? new Date(t.last).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {perTelecaller.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No telecallers yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
