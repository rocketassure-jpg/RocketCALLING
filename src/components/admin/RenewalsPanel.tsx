import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlarmClock, Phone, MessageCircle, Search } from "lucide-react";

type Lead = { id: string; customer_name: string; phone_number: string; policy_type: string; policy_expiry_date: string; premium_amount: number; areas?: { name: string } | null };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export const RenewalsPanel = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(addDays(7));
  const [leads, setLeads] = useState<Lead[]>([]);
  const [weekCount, setWeekCount] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("leads")
      .select("id,customer_name,phone_number,policy_type,policy_expiry_date,premium_amount, areas(name)")
      .not("policy_expiry_date", "is", null)
      .gte("policy_expiry_date", from)
      .lte("policy_expiry_date", to)
      .order("policy_expiry_date", { ascending: true });
    setLeads((data ?? []) as any);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    supabase.from("leads").select("id", { count: "exact", head: true })
      .gte("policy_expiry_date", today()).lte("policy_expiry_date", addDays(7))
      .then(({ count }) => setWeekCount(count ?? 0));
  }, []);

  const tone = (d: string) => {
    if (d === today()) return "border-l-destructive bg-destructive/5";
    if (d <= addDays(7)) return "border-l-warning bg-warning/5";
    if (d <= addDays(30)) return "border-l-primary bg-primary/5";
    return "border-l-muted";
  };

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-destructive">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Expiring this week</div>
              <div className="text-2xl font-extrabold">{weekCount} <span className="text-xs font-normal text-muted-foreground">policies</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Policy Renewals — Bima Tarikh Filter</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5"><Label>From Date</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>To Date</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="flex items-end"><Button variant="hero" className="w-full" onClick={load}>Show Leads</Button></div>
          </div>
        </CardContent>
      </Card>

      {leads.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Is range mein koi renewal nahi.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <Card key={l.id} className={`border-l-4 ${tone(l.policy_expiry_date)}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{l.customer_name}</span>
                    <Badge variant="outline">{l.policy_type}</Badge>
                    <Badge className={l.policy_expiry_date === today() ? "bg-destructive text-destructive-foreground" : l.policy_expiry_date <= addDays(7) ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"}>
                      Exp: {l.policy_expiry_date}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{l.phone_number} · {l.areas?.name ?? "—"} · ₹{Number(l.premium_amount || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="hero"><a href={`tel:${l.phone_number}`}><Phone className="h-4 w-4" /> Dial</a></Button>
                  <Button asChild size="sm" variant="success"><a href={`https://wa.me/${l.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> WA</a></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
