import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TC = { id: string; full_name: string };

export const ManagerTeamPanel = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TC[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [calledIds, setCalledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = await supabase.from("profiles").select("id,full_name").eq("manager_id", user.id);
      setTeam((t.data ?? []) as any);
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const cl = await supabase.from("call_logs").select("telecaller_id,status,called_at,lead_id").gte("called_at", start.toISOString());
      setCallLogs(cl.data ?? []);
      const ld = await supabase.from("leads").select("id,assigned_telecaller,status,follow_up_date");
      setLeads(ld.data ?? []);
      const all = await supabase.from("call_logs").select("lead_id");
      setCalledIds(new Set((all.data ?? []).map((x: any) => x.lead_id)));
    })();
  }, [user]);

  const totals = useMemo(() => {
    const total = callLogs.length;
    const interested = callLogs.filter((c) => c.status === "Interested").length;
    const followup = leads.filter((l) => l.status === "Follow-up").length;
    return { total, interested, followup };
  }, [callLogs, leads]);

  const cards = useMemo(() => team.map((t) => {
    const tcCalls = callLogs.filter((c) => c.telecaller_id === t.id);
    const interested = tcCalls.filter((c) => c.status === "Interested").length;
    const followup = leads.filter((l) => l.assigned_telecaller === t.id && l.status === "Follow-up").length;
    const untouched = leads.filter((l) => l.assigned_telecaller === t.id && !calledIds.has(l.id)).length;
    const last = tcCalls.reduce<string | null>((acc, c) => (!acc || c.called_at > acc ? c.called_at : acc), null);
    let status: "active" | "idle" | "off" = "off";
    if (last) {
      const ageMin = (Date.now() - new Date(last).getTime()) / 60000;
      status = ageMin <= 60 ? "active" : "idle";
    }
    const initial = (t.full_name || "?").trim().charAt(0).toUpperCase();
    return { ...t, calls: tcCalls.length, interested, followup, untouched, status, initial };
  }), [team, callLogs, leads, calledIds]);

  const dot = (s: string) => s === "active" ? "bg-success" : s === "idle" ? "bg-warning" : "bg-destructive";
  const dotLabel = (s: string) => s === "active" ? "Active" : s === "idle" ? "Idle" : "Not started";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase">Calls today</div><div className="text-2xl font-extrabold">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase">Interested</div><div className="text-2xl font-extrabold text-success">{totals.interested}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase">Follow-ups</div><div className="text-2xl font-extrabold text-warning">{totals.followup}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My Team ({team.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cards.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Aapki team mein abhi koi telecaller assigned nahi hai.</p> :
            cards.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">{c.initial}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.full_name || "(no name)"}</span>
                    <span className={`inline-flex h-2 w-2 rounded-full ${dot(c.status)}`} title={dotLabel(c.status)} />
                    <span className="text-xs text-muted-foreground">{dotLabel(c.status)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">{c.calls} calls</Badge>
                    <Badge className="bg-success text-success-foreground">{c.interested} Interested</Badge>
                    <Badge className="bg-warning text-warning-foreground">{c.followup} Follow-up</Badge>
                    <Badge variant="outline" className="border-warning/50 text-warning">{c.untouched} untouched</Badge>
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};
