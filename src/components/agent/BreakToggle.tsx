import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Coffee, Square, Loader2 } from "lucide-react";

const REASONS = ["Lunch", "Tea", "Personal", "Meeting", "Training"];

export const BreakToggle = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<{ id: string; reason: string; started_at: string } | null>(null);
  const [reason, setReason] = useState("Tea");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("break_logs").select("id,reason,started_at").eq("telecaller_id", user.id).is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
    setActive(data ?? null); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (!active) return; const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, [active]);

  const start = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("break_logs").insert({ telecaller_id: user.id, reason }).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setActive(data); toast({ title: `Break started: ${reason}` });
  };
  const stop = async () => {
    if (!active) return;
    const { error } = await supabase.from("break_logs").update({ ended_at: new Date().toISOString() }).eq("id", active.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setActive(null); toast({ title: "Break ended. Welcome back!" });
  };

  if (loading) return null;

  if (active) {
    const ms = Date.now() - new Date(active.started_at).getTime();
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return (
      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2 font-medium text-warning"><Coffee className="h-4 w-4" /> On break: {active.reason}</div>
            <div className="mt-1 font-mono text-2xl">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
          </div>
          <Button variant="destructive" onClick={stop}><Square className="h-4 w-4" /> End Break</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Coffee className="h-4 w-4 text-primary" /> Take a Break</div>
        <div className="flex items-center gap-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={start}>Start</Button>
        </div>
      </CardContent>
    </Card>
  );
};
