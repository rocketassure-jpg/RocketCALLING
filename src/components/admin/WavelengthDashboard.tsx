import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Phone, PhoneOff, User, IndianRupee, TrendingUp, Loader2, PhoneIncoming, PhoneOutgoing, Clock, Timer } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, Cell } from "recharts";

type Range = "today" | "7d" | "30d";

const rangeStart = (r: Range) => {
  const d = new Date();
  if (r === "today") d.setHours(0, 0, 0, 0);
  if (r === "7d") d.setDate(d.getDate() - 6);
  if (r === "30d") d.setDate(d.getDate() - 29);
  if (r !== "today") d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec}s`;
};

export const WavelengthDashboard = () => {
  const [range, setRange] = useState<Range>("today");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    connected: 0, notConnected: 0, personal: 0, premium: 0, openActions: 0,
    outbound: 0, inbound: 0, totalTalk: 0, avgTalk: 0,
  });
  const [trend, setTrend] = useState<{ day: string; connected: number; notConnected: number }[]>([]);
  const [funnel, setFunnel] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = rangeStart(range);
      const [dials, calls, leads] = await Promise.all([
        supabase.from("dial_logs").select("clicked_at,call_type,connected,duration_seconds").gte("clicked_at", since),
        supabase.from("call_logs").select("called_at,status").gte("called_at", since),
        supabase.from("leads").select("status,premium_amount,call_date"),
      ]);
      const d = dials.data ?? [];
      const c = calls.data ?? [];
      const l = leads.data ?? [];

      const personal = d.filter((x: any) => x.call_type === "Personal").length;
      const inbound = d.filter((x: any) => x.call_type === "Inbound").length;
      const outbound = d.filter((x: any) => x.call_type === "Outbound").length;
      const connectedStatuses = new Set(["Interested", "Done", "Follow-up", "Not Interested"]);
      const connected = d.filter((x: any) => x.connected && x.call_type !== "Personal").length
        + c.filter((x: any) => connectedStatuses.has(x.status)).length;
      const notConnected = d.filter((x: any) => !x.connected && x.call_type !== "Personal").length
        + c.filter((x: any) => x.status === "Not Picked").length;

      const totalTalk = d.reduce((s: number, x: any) => s + (x.duration_seconds || 0), 0);
      const connectedDials = d.filter((x: any) => x.connected);
      const avgTalk = connectedDials.length ? totalTalk / connectedDials.length : 0;

      const premium = l.filter((x: any) => x.status === "Done").reduce((s: number, x: any) => s + Number(x.premium_amount || 0), 0);
      const today = new Date().toISOString().slice(0, 10);
      const openActions = l.filter((x: any) => x.call_date <= today && !["Done", "Unsubscribed", "Not Interested"].includes(x.status)).length;

      setStats({ connected, notConnected, personal, premium, openActions, outbound, inbound, totalTalk, avgTalk });

      // Customer Funnel
      const start = l.filter((x: any) => x.status === "New").length;
      const inProgress = l.filter((x: any) => ["Follow-up", "Interested"].includes(x.status)).length;
      const won = l.filter((x: any) => x.status === "Done").length;
      const lost = l.filter((x: any) => ["Not Interested", "Unsubscribed"].includes(x.status)).length;
      setFunnel([
        { name: "Start", value: start, color: "hsl(217 91% 60%)" },
        { name: "In Progress", value: inProgress, color: "hsl(45 93% 55%)" },
        { name: "Closed Won", value: won, color: "hsl(142 71% 45%)" },
        { name: "Closed Lost", value: lost, color: "hsl(0 84% 60%)" },
      ]);

      // Trend
      const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
      const buckets: Record<string, { connected: number; notConnected: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        buckets[dt.toISOString().slice(0, 10)] = { connected: 0, notConnected: 0 };
      }
      d.forEach((x: any) => {
        const k = (x.clicked_at as string).slice(0, 10);
        if (!buckets[k] || x.call_type === "Personal") return;
        if (x.connected) buckets[k].connected++; else buckets[k].notConnected++;
      });
      c.forEach((x: any) => {
        const k = (x.called_at as string).slice(0, 10);
        if (!buckets[k]) return;
        if (connectedStatuses.has(x.status)) buckets[k].connected++;
        else if (x.status === "Not Picked") buckets[k].notConnected++;
      });
      setTrend(Object.entries(buckets).map(([day, v]) => ({ day: day.slice(5), ...v })));
      setLoading(false);
    })();
  }, [range]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const callTotal = stats.connected + stats.notConnected + stats.personal || 1;
  const metricCards = [
    { label: "Connected", value: stats.connected, icon: Phone, bg: "from-blue-500 to-blue-600", pct: Math.round((stats.connected / callTotal) * 100) },
    { label: "Not Connected", value: stats.notConnected, icon: PhoneOff, bg: "from-pink-500 to-rose-600", pct: Math.round((stats.notConnected / callTotal) * 100) },
    { label: "Personal", value: stats.personal, icon: User, bg: "from-purple-500 to-fuchsia-600", pct: Math.round((stats.personal / callTotal) * 100) },
    { label: "Premium ₹", value: stats.premium.toLocaleString("en-IN"), icon: IndianRupee, bg: "from-orange-500 to-red-600", pct: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wavelength</h1>
          <p className="text-sm text-muted-foreground">Real-time call analytics</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-background p-1">
          {(["today", "7d", "30d"] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "hero" : "ghost"} onClick={() => setRange(r)}>
              {r === "today" ? "Today" : r === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric cards with progress bars */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metricCards.map((c) => (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${c.bg} p-4 text-white`}>
                <c.icon className="h-5 w-5 opacity-80" />
                <div className="mt-3 text-xs opacity-90">{c.label}</div>
                <div className="mt-1 text-3xl font-bold">{c.value}</div>
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] opacity-80">{c.pct}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call breakdown row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-blue-100 p-2 text-blue-600"><PhoneOutgoing className="h-5 w-5" /></div><div><div className="text-xs text-muted-foreground">Overall Outbound</div><div className="text-2xl font-bold">{stats.outbound}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-green-100 p-2 text-green-600"><PhoneIncoming className="h-5 w-5" /></div><div><div className="text-xs text-muted-foreground">Overall Inbound</div><div className="text-2xl font-bold">{stats.inbound}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-orange-100 p-2 text-orange-600"><Clock className="h-5 w-5" /></div><div><div className="text-xs text-muted-foreground">Avg Talk Time</div><div className="text-2xl font-bold">{fmtTime(stats.avgTalk)}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-red-100 p-2 text-red-600"><Timer className="h-5 w-5" /></div><div><div className="text-xs text-muted-foreground">Total Talk Time</div><div className="text-2xl font-bold">{fmtTime(stats.totalTalk)}</div></div></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Call Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="connected" stroke="hsl(217 91% 60%)" strokeWidth={2} name="Connected" />
                <Line type="monotone" dataKey="notConnected" stroke="hsl(340 82% 60%)" strokeWidth={2} name="Not Connected" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Open Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-primary">{stats.openActions}</div>
            <p className="mt-2 text-sm text-muted-foreground">Leads pending action today or earlier</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Funnel */}
      <Card>
        <CardHeader><CardTitle>Customer Funnel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {funnel.map((f, i) => <Cell key={i} fill={f.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
