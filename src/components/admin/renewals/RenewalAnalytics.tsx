import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const RenewalAnalytics = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      const startISO = start.toISOString().slice(0,10);
      const endISO = end.toISOString().slice(0,10);

      const { data: rs } = await supabase.from("renewals").select("status,assigned_telecaller_id")
        .gte("expiry_date", startISO).lt("expiry_date", endISO);
      const { data: logs } = await supabase.from("campaign_logs").select("channel,status").gte("created_at", start.toISOString());
      const { data: profs } = await supabase.from("profiles").select("id,full_name");

      const total = rs?.length ?? 0;
      const by = (s: string) => (rs ?? []).filter((r: any) => r.status === s).length;
      const renewed = by("renewed");
      const conv = total ? Math.round((renewed / total) * 1000) / 10 : 0;
      const channelStats: Record<string, number> = {};
      (logs ?? []).forEach((l: any) => { channelStats[l.channel] = (channelStats[l.channel] ?? 0) + 1; });
      const nameOf = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const tcStats: Record<string, { name: string; total: number; renewed: number }> = {};
      (rs ?? []).forEach((r: any) => {
        if (!r.assigned_telecaller_id) return;
        const key = r.assigned_telecaller_id;
        if (!tcStats[key]) tcStats[key] = { name: nameOf.get(key) ?? "—", total: 0, renewed: 0 };
        tcStats[key].total++;
        if (r.status === "renewed") tcStats[key].renewed++;
      });
      setData({ total, pending: by("pending"), contacted: by("contacted"), renewed, lost: by("lost"), conv, channelStats, tcStats });
    })();
  }, []);

  if (!data) return <div className="grid gap-3 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  const Stat = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <Card><CardContent className="p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone ?? ""}`}>{value}</div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Due this month" value={data.total} />
        <Stat label="Pending" value={data.pending} tone="text-orange-500" />
        <Stat label="Contacted" value={data.contacted} tone="text-blue-500" />
        <Stat label="Renewed" value={data.renewed} tone="text-emerald-500" />
        <Stat label="Conversion" value={`${data.conv}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Channel Activity (this month)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.keys(data.channelStats).length === 0 && <span className="text-sm text-muted-foreground">Abhi koi message log nahi.</span>}
          {Object.entries(data.channelStats).map(([k, v]) => (
            <Badge key={k} variant="outline" className="text-sm">{k}: <span className="ml-1 font-bold">{v as number}</span></Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Telecaller Performance</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.values(data.tcStats).length === 0 && <div className="text-sm text-muted-foreground">Koi assignment nahi.</div>}
          {Object.values(data.tcStats).map((t: any) => (
            <div key={t.name} className="flex items-center justify-between rounded-md border p-2">
              <div className="font-medium">{t.name}</div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{t.renewed}/{t.total} renewed</Badge>
                <Badge>{t.total ? Math.round((t.renewed / t.total) * 100) : 0}%</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
