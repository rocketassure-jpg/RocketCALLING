import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageCircle, Search, Flame, TrendingUp, TrendingDown, Calendar, AlertTriangle, UserX, Sparkles } from "lucide-react";

type Renewal = {
  id: string;
  customer_name: string | null;
  phone_number: string | null;
  policy_type: string | null;
  policy_number: string | null;
  expiry_date: string;
  premium_amount: number | null;
  status: string;
  last_contact_at: string | null;
  notes: string | null;
};

type Scored = Renewal & { score: number; reason: string; daysToExpiry: number };

const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

/**
 * Heuristic AI Renewal Score (0-100)
 * Signals: days-to-expiry, status, last-contact recency, policy type stickiness, premium band.
 * Higher = more likely to renew → call first.
 */
const scoreRenewal = (r: Renewal): { score: number; reason: string; daysToExpiry: number } => {
  const today = new Date();
  const exp = new Date(r.expiry_date);
  const d = daysBetween(exp, today);

  let s = 50;
  const reasons: string[] = [];

  // Days-to-expiry curve: due today / next 7 days = peak intent
  if (d >= 0 && d <= 1) { s += 22; reasons.push("Due today"); }
  else if (d > 1 && d <= 7) { s += 18; reasons.push("Due ≤7d"); }
  else if (d > 7 && d <= 30) { s += 10; reasons.push("Due ≤30d"); }
  else if (d < 0 && d >= -7) { s -= 12; reasons.push("Just lapsed"); }
  else if (d < -7 && d >= -30) { s -= 22; reasons.push("Missed >7d"); }
  else if (d < -30) { s -= 35; reasons.push("Lost window"); }

  // Status signal
  if (r.status === "contacted") { s += 12; reasons.push("Already contacted"); }
  if (r.status === "renewed") { s = 100; reasons.push("Renewed"); }
  if (r.status === "lost") { s = Math.min(s, 18); reasons.push("Marked lost"); }

  // Recent contact = momentum
  if (r.last_contact_at) {
    const last = new Date(r.last_contact_at);
    const since = daysBetween(today, last);
    if (since <= 2) { s += 8; reasons.push("Contacted recently"); }
    else if (since > 21) { s -= 6; reasons.push("Stale"); }
  } else {
    s -= 4; reasons.push("Never contacted");
  }

  // Policy stickiness (Health > Life > Motor generally renews higher)
  const t = (r.policy_type ?? "").toLowerCase();
  if (t.includes("health")) s += 6;
  else if (t.includes("life")) s += 4;
  else if (t.includes("motor")) s += 2;

  // Premium band — mid premium customers renew most
  const p = r.premium_amount ?? 0;
  if (p >= 5000 && p <= 30000) s += 5;
  else if (p > 80000) s -= 4;

  // Has notes = engaged history
  if (r.notes && r.notes.trim().length > 0) s += 3;

  s = Math.max(0, Math.min(100, Math.round(s)));
  return { score: s, reason: reasons.slice(0, 2).join(" · ") || "Standard profile", daysToExpiry: d };
};

const scoreBadge = (score: number) => {
  if (score >= 80) return { variant: "default" as const, label: "Hot", icon: Flame, cls: "bg-emerald-600 text-white hover:bg-emerald-600" };
  if (score >= 50) return { variant: "secondary" as const, label: "Warm", icon: TrendingUp, cls: "bg-amber-500 text-white hover:bg-amber-500" };
  return { variant: "outline" as const, label: "Cold", icon: TrendingDown, cls: "bg-rose-500 text-white hover:bg-rose-500" };
};

const buckets = [
  { id: "today", label: "Due Today", icon: Calendar, match: (d: number) => d >= 0 && d <= 1 },
  { id: "7d", label: "Due 7 Days", icon: Calendar, match: (d: number) => d > 1 && d <= 7 },
  { id: "30d", label: "Due 30 Days", icon: Calendar, match: (d: number) => d > 7 && d <= 30 },
  { id: "missed", label: "Missed Renewals", icon: AlertTriangle, match: (d: number) => d < 0 && d >= -30 },
  { id: "lost", label: "Lost Customers", icon: UserX, match: (d: number) => d < -30 },
] as const;

export const RenewalCommandCenter = () => {
  const [rows, setRows] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("today");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("renewals")
        .select("id,customer_name,phone_number,policy_type,policy_number,expiry_date,premium_amount,status,last_contact_at,notes")
        .order("expiry_date", { ascending: true });
      setRows((data ?? []) as Renewal[]);
      setLoading(false);
    })();
  }, []);

  const scored: Scored[] = useMemo(
    () => rows.map((r) => ({ ...r, ...scoreRenewal(r) })),
    [rows]
  );

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? scored.filter((r) =>
          (r.customer_name ?? "").toLowerCase().includes(q) ||
          (r.phone_number ?? "").includes(q) ||
          (r.policy_number ?? "").toLowerCase().includes(q)
        )
      : scored;
  }, [scored, search]);

  const grouped = useMemo(() => {
    const m: Record<string, Scored[]> = {};
    buckets.forEach((b) => {
      m[b.id] = filteredAll
        .filter((r) => b.match(r.daysToExpiry))
        .sort((a, b2) => b2.score - a.score);
    });
    return m;
  }, [filteredAll]);

  const counts = buckets.map((b) => ({ ...b, count: grouped[b.id]?.length ?? 0 }));
  const hotCount = filteredAll.filter((r) => r.score >= 80).length;
  const totalCount = filteredAll.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" /> Renewal Command Center
          </h2>
          <p className="text-sm text-muted-foreground">
            AI ne customers ko renewal probability ke hisaab se rank kiya hai — pehle <b>Hot</b> leads call karo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600"><Flame className="mr-1 h-3 w-3" /> {hotCount} Hot</Badge>
          <Badge variant="outline">{totalCount} total</Badge>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, phone, policy no…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          {counts.map((b) => (
            <TabsTrigger key={b.id} value={b.id} className="gap-1">
              <b.icon className="h-4 w-4" /> {b.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{b.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {buckets.map((b) => (
          <TabsContent key={b.id} value={b.id} className="space-y-2">
            {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
            {!loading && grouped[b.id]?.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Is bucket me koi renewal nahi mila.</p>
            )}
            {grouped[b.id]?.map((r) => {
              const sb = scoreBadge(r.score);
              const SIcon = sb.icon;
              return (
                <Card key={r.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
                    {/* Score gauge */}
                    <div className="flex shrink-0 items-center gap-3">
                      <div
                        className="flex h-14 w-14 flex-col items-center justify-center rounded-full text-white shadow-sm"
                        style={{
                          background: `conic-gradient(${
                            r.score >= 80 ? "hsl(142 71% 45%)" : r.score >= 50 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)"
                          } ${r.score * 3.6}deg, hsl(var(--muted)) 0deg)`,
                        }}
                      >
                        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-background text-foreground">
                          <span className="text-sm font-bold leading-none">{r.score}%</span>
                          <span className="text-[9px] uppercase text-muted-foreground">renew</span>
                        </div>
                      </div>
                      <Badge className={sb.cls}>
                        <SIcon className="mr-1 h-3 w-3" /> {sb.label}
                      </Badge>
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{r.customer_name ?? "Unknown"}</span>
                        <Badge variant="outline" className="font-mono text-xs">{r.phone_number ?? "—"}</Badge>
                        {r.policy_type && <Badge variant="secondary" className="text-xs">{r.policy_type}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Policy <span className="font-mono">{r.policy_number ?? "—"}</span> · Premium ₹{(r.premium_amount ?? 0).toLocaleString("en-IN")} · Expires {r.expiry_date}
                        {r.daysToExpiry >= 0 ? ` (in ${r.daysToExpiry}d)` : ` (${Math.abs(r.daysToExpiry)}d ago)`}
                      </p>
                      <p className="mt-1 text-xs italic text-muted-foreground">AI: {r.reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-2">
                      {r.phone_number && (
                        <>
                          <Button size="sm" variant="default" asChild>
                            <a href={`tel:${r.phone_number}`}><Phone className="mr-1 h-3 w-3" /> Call</a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`https://wa.me/${r.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                              <MessageCircle className="mr-1 h-3 w-3" /> WA
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
