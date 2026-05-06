import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Range = "today" | "week" | "month" | "all";

const rangeStart = (r: Range) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === "week") d.setDate(d.getDate() - 7);
  else if (r === "month") d.setDate(1);
  else if (r === "all") return new Date(0);
  return d;
};

export const PerformancePanel = () => {
  const [telecallers, setTelecallers] = useState<{ id: string; full_name: string }[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [range, setRange] = useState<Range>("week");
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [calledLeadIds, setCalledLeadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const r = await supabase.from("user_roles").select("user_id, profiles(id,full_name)").eq("role", "telecaller");
      setTelecallers((r.data ?? []).map((x: any) => x.profiles).filter(Boolean));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const start = rangeStart(range).toISOString();
      const { data: cl } = await supabase.from("call_logs").select("telecaller_id,status,called_at,lead_id").gte("called_at", start);
      setCallLogs(cl ?? []);
      const { data: ld } = await supabase.from("leads").select("id,assigned_telecaller,status");
      setLeads(ld ?? []);
      const allCalled = await supabase.from("call_logs").select("lead_id");
      setCalledLeadIds(new Set((allCalled.data ?? []).map((x: any) => x.lead_id)));
    })();
  }, [range]);

  const stats = useMemo(() => {
    const tcs = selected === "all" ? telecallers : telecallers.filter((t) => t.id === selected);
    return tcs.map((t) => {
      const tcCalls = callLogs.filter((c) => c.telecaller_id === t.id);
      const interested = tcCalls.filter((c) => c.status === "Interested").length;
      const followup = tcCalls.filter((c) => c.status === "Follow-up").length;
      const done = tcCalls.filter((c) => c.status === "Done").length;
      const untouched = leads.filter((l) => l.assigned_telecaller === t.id && !calledLeadIds.has(l.id)).length;
      const total = tcCalls.length;
      const score = total > 0 ? Math.round((interested * 2 + done * 5) / total * 100) : 0;
      const stars = score >= 60 ? "⭐⭐⭐" : score >= 30 ? "⭐⭐" : score > 0 ? "⭐" : "—";
      return { ...t, total, interested, followup, done, untouched, score, stars };
    });
  }, [selected, telecallers, callLogs, leads, calledLeadIds]);

  const maxCalls = Math.max(1, ...stats.map((s) => s.total));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Telecaller Performance</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Telecallers</SelectItem>
                {telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {(["today", "week", "month", "all"] as Range[]).map((r) => (
                <Button key={r} size="sm" variant={range === r ? "hero" : "outline"} onClick={() => setRange(r)}>
                  {r === "today" ? "Today" : r === "week" ? "Week" : r === "month" ? "Month" : "All"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Telecaller</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead className="text-right">Interested</TableHead>
            <TableHead className="text-right">Done</TableHead>
            <TableHead className="text-right">Untouched</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {stats.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No telecallers.</TableCell></TableRow>
            ) : stats.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name || "(no name)"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.total}</TableCell>
                <TableCell className="w-32">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(s.total / maxCalls) * 100}%` }} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-success">{s.interested}</TableCell>
                <TableCell className="text-right text-primary">{s.done}</TableCell>
                <TableCell className="text-right text-warning">{s.untouched}</TableCell>
                <TableCell className="text-right"><Badge variant="outline">{s.stars} {s.score}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
