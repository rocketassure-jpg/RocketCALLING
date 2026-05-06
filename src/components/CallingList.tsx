import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageCircle, MessageSquare, Search, Loader2, MapPin, Ban, Calendar, IndianRupee, AlarmClock, History, ArrowRight, Sparkles, Flame, ThumbsUp, Clock, PhoneCall, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { LeadTimeline } from "./LeadTimeline";
import { Textarea } from "@/components/ui/textarea";

type Status = "New" | "Interested" | "Quote Sent" | "Premium Quoted" | "Negotiation" | "Converted" | "Follow-up" | "Not Picked" | "Transfer to Senior" | "Not Interested" | "Unsubscribed" | "Done";

type Lead = {
  id: string;
  customer_name: string;
  phone_number: string;
  policy_type: "Life" | "Health" | "Motor";
  status: Status;
  last_called_at: string | null;
  call_date: string;
  premium_amount: number;
  area_id: string;
  policy_expiry_date: string | null;
  areas?: { name: string } | null;
};

const STATUS_OPTIONS: Status[] = ["New", "Interested", "Quote Sent", "Premium Quoted", "Negotiation", "Converted", "Follow-up", "Not Picked", "Transfer to Senior", "Not Interested", "Done"];

const statusColor = (s: string) => {
  switch (s) {
    case "Interested": return "bg-success text-success-foreground";
    case "Quote Sent": return "bg-accent text-accent-foreground";
    case "Premium Quoted": return "bg-warning text-warning-foreground";
    case "Negotiation": return "bg-warning text-warning-foreground";
    case "Converted": return "bg-success text-success-foreground";
    case "Done": return "bg-primary text-primary-foreground";
    case "Follow-up": return "bg-warning text-warning-foreground";
    case "Transfer to Senior": return "bg-accent text-accent-foreground";
    case "Not Picked": return "bg-muted text-muted-foreground";
    case "Not Interested": return "bg-destructive text-destructive-foreground";
    case "Unsubscribed": return "bg-destructive text-destructive-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
};


const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (d: string) => d < today();
const daysUntil = (d: string | null) => {
  if (!d) return null;
  const ms = new Date(d + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

type Bucket = "all" | "today" | "overdue" | "interested" | "followup" | "cold" | "untouched";

export const CallingList = ({ callerName = "Rocket Services", filterAssigned = false }: { callerName?: string; filterAssigned?: boolean }) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<Bucket>("today");
  const [autoNextId, setAutoNextId] = useState<string | null>(null);
  const [dialCounts, setDialCounts] = useState<Record<string, number>>({});
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [dialHistory, setDialHistory] = useState<{ clicked_at: string; connected: boolean }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [telecallerList, setTelecallerList] = useState<{ id: string; full_name: string }[]>([]);
  const [untouchedIds, setUntouchedIds] = useState<Set<string>>(new Set());
  const [todayStats, setTodayStats] = useState({ total: 0, interested: 0, followup: 0, notInterested: 0 });
  const [noteDialog, setNoteDialog] = useState<{ lead: Lead; status: Status } | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    supabase.from("user_roles").select("user_id, profiles(id,full_name)").eq("role", "telecaller").then(({ data }) => {
      const list = (data ?? []).map((r: any) => r.profiles).filter(Boolean);
      setTelecallerList(list);
    });
  }, []);

  const toggleSelect = (id: string) => setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const loadDialCounts = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    const { data } = await supabase.from("dial_logs").select("lead_id").in("lead_id", leadIds);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { counts[r.lead_id] = (counts[r.lead_id] ?? 0) + 1; });
    setDialCounts(counts);
  };

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("leads")
      .select("id,customer_name,phone_number,policy_type,status,last_called_at,call_date,premium_amount,area_id,policy_expiry_date,assigned_telecaller, areas(name)")
      .not("status", "in", "(Unsubscribed,Done,Not Interested)")
      .order("call_date", { ascending: true });
    if (filterAssigned && user) {
      q = q.or(`assigned_telecaller.eq.${user.id},assigned_telecaller.is.null`);
    }
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    const list = (data ?? []) as any[];
    setLeads(list as any);
    setLoading(false);
    loadDialCounts(list.map((l) => l.id));
    // Untouched = leads with no call_logs ever
    const ids = list.map((l) => l.id);
    if (ids.length) {
      const { data: cl } = await supabase.from("call_logs").select("lead_id").in("lead_id", ids);
      const called = new Set((cl ?? []).map((r: any) => r.lead_id));
      setUntouchedIds(new Set(ids.filter((i) => !called.has(i))));
    }
  };

  const loadTodayStats = async () => {
    if (!user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await supabase.from("call_logs").select("status").eq("telecaller_id", user.id).gte("called_at", start.toISOString());
    const rows = data ?? [];
    setTodayStats({
      total: rows.length,
      interested: rows.filter((r: any) => r.status === "Interested").length,
      followup: rows.filter((r: any) => r.status === "Follow-up").length,
      notInterested: rows.filter((r: any) => r.status === "Not Interested").length,
    });
  };

  useEffect(() => { load(); loadTodayStats(); }, []);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("call_logs_today")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs", filter: `telecaller_id=eq.${user.id}` }, () => loadTodayStats())
      .subscribe();
    const iv = setInterval(loadTodayStats, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [user?.id]);

  const updateStatus = async (lead: Lead, newStatus: Status, note?: string) => {
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("leads").update({ status: newStatus, last_called_at: now }).eq("id", lead.id);
    if (e1) return toast({ title: "Update failed", description: e1.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: newStatus, notes: note || null });
    toast({ title: "Saved", description: `${lead.customer_name} → ${newStatus}` });

    // Auto-trigger Thank You message when marked Interested
    if (newStatus === "Interested") {
      const msg = `Hi ${lead.customer_name}, thank you for your interest in Rocket Services Insurance! Our team will contact you shortly with the best ${lead.policy_type} policy options. — Rocket Services`;
      supabase.functions.invoke("send-whatsapp", { body: { lead_id: lead.id, phone_number: lead.phone_number, template: "thank_you", message: msg } }).catch(() => {});
      supabase.functions.invoke("send-sms", { body: { lead_id: lead.id, phone_number: lead.phone_number, message: msg } }).catch(() => {});
    }

    // Auto-next: pick next visible lead in current filtered view
    const idx = filtered.findIndex((l) => l.id === lead.id);
    const next = filtered[idx + 1] ?? filtered.find((l) => l.id !== lead.id);
    if (next) setAutoNextId(next.id);
    if (["Done", "Not Interested"].includes(newStatus)) setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    else setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus, last_called_at: now } : l)));
  };

  const unsubscribe = async (lead: Lead) => {
    const { error } = await supabase.from("leads").update({ status: "Unsubscribed", last_called_at: new Date().toISOString() }).eq("id", lead.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: "Unsubscribed" });
    toast({ title: "Marked DNC", description: `${lead.customer_name} ko ab call nahi lagega.` });
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
  };

  const logDial = async (lead: Lead) => {
    if (user) await supabase.from("dial_logs").insert({ lead_id: lead.id, telecaller_id: user.id });
    setDialCounts((prev) => ({ ...prev, [lead.id]: (prev[lead.id] ?? 0) + 1 }));
  };

  const openDialHistory = async (lead: Lead) => {
    setHistoryLead(lead);
    const { data } = await supabase.from("dial_logs").select("clicked_at,connected").eq("lead_id", lead.id).order("clicked_at", { ascending: false });
    setDialHistory((data ?? []) as any);
  };

  const waMessage = (name: string) =>
    encodeURIComponent(`Namaste ${name}, main Rocket Services se ${callerName} baat kar raha hoon. Aapke liye ek special insurance plan hai. Kya aap 2 minute baat kar sakte hain?`);
  const waQuote = (name: string) =>
    encodeURIComponent(`Namaste ${name}, Rocket Services se quote bhej rahe hain. Aapke liye best premium rate ready hai — confirm kariye to policy aaj hi process ho jayegi.`);
  const waThanks = (name: string) =>
    encodeURIComponent(`Dhanyavaad ${name} ji! Rocket Services par bharosa rakhne ke liye shukriya. Kisi bhi help ke liye humein call kar sakte hain.`);
  const smsMessage = encodeURIComponent(`Namaste, Rocket Services se ${callerName}. Hum aapko ek special insurance offer dene ke liye call karna chahte hain.`);

  const stats = useMemo(() => ({
    today: leads.filter((l) => l.call_date === today()).length,
    overdue: leads.filter((l) => isOverdue(l.call_date)).length,
    interested: leads.filter((l) => l.status === "Interested").length,
    followup: leads.filter((l) => l.status === "Follow-up").length,
    cold: leads.filter((l) => l.status === "New" || l.status === "Not Picked").length,
    untouched: leads.filter((l) => untouchedIds.has(l.id)).length,
  }), [leads, untouchedIds]);

  const filtered = useMemo(() => {
    const list = leads.filter((l) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const last4 = l.phone_number.replace(/\D/g, "").slice(-4);
        if (!l.customer_name.toLowerCase().includes(q) && !l.phone_number.includes(q) && !last4.includes(q)) return false;
      }
      switch (bucket) {
        case "today": return l.call_date <= today();
        case "overdue": return isOverdue(l.call_date);
        case "interested": return l.status === "Interested";
        case "followup": return l.status === "Follow-up";
        case "cold": return l.status === "New" || l.status === "Not Picked";
        case "untouched": return untouchedIds.has(l.id);
        default: return true;
      }
    });
    // Untouched leads always float to top in default views
    return [...list].sort((a, b) => {
      const ua = untouchedIds.has(a.id) ? 0 : 1;
      const ub = untouchedIds.has(b.id) ? 0 : 1;
      return ua - ub;
    });
  }, [leads, search, bucket, untouchedIds]);

  const buckets: { id: Bucket; label: string; value: number; accent: string; icon: any }[] = [
    { id: "today",      label: "To Call",    value: stats.today,      accent: "border-l-primary",       icon: PhoneCall },
    { id: "overdue",    label: "Overdue",    value: stats.overdue,    accent: "border-l-destructive",   icon: AlarmClock },
    { id: "untouched",  label: "Untouched",  value: stats.untouched,  accent: "border-l-warning",       icon: Sparkles },
    { id: "interested", label: "Interested", value: stats.interested, accent: "border-l-success",       icon: ThumbsUp },
    { id: "followup",   label: "Follow-up",  value: stats.followup,   accent: "border-l-warning",       icon: Clock },
    { id: "cold",       label: "Cold",       value: stats.cold,       accent: "border-l-muted-foreground", icon: Flame },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards — responsive 3-col mobile, 6-col desktop, hover scale */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {buckets.map((b) => {
          const active = bucket === b.id;
          const Icon = b.icon;
          return (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              title="Click to filter leads"
              className={`group relative overflow-hidden rounded-xl border-l-4 ${b.accent} bg-card p-3 text-left shadow-card-pop transition-all duration-200 hover:scale-[1.04] hover:shadow-elegant cursor-pointer md:p-4 ${active ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-muted-foreground md:h-3.5 md:w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:text-xs">{b.label}</span>
              </div>
              <div className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-foreground md:text-2xl">{b.value}</div>
            </button>
          );
        })}
      </div>

      {/* Today's session card (Dialed today + breakdown) */}
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 md:p-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dialed today</div>
              <div className="text-xl font-extrabold tabular-nums">{todayStats.total} <span className="text-xs font-normal text-muted-foreground">calls</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-success text-success-foreground">{todayStats.interested} Interested</Badge>
            <Badge className="bg-warning text-warning-foreground">{todayStats.followup} Follow-up</Badge>
            <Badge variant="outline">{todayStats.notInterested} Not Int.</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 rounded-full border-border/70 bg-card pl-10 pr-4 shadow-card-pop focus-visible:ring-primary/30"
          placeholder="Search name, phone, last 4 digits…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-sm">
          <Checkbox
            checked={filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id))}
            onCheckedChange={(v) => setSelectedIds(v ? new Set(filtered.map((l) => l.id)) : new Set())}
          />
          <span className="text-muted-foreground">Select all ({filtered.length})</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          🎉 Koi pending lead nahi hai. Shabaash!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const overdue = isOverdue(lead.call_date);
            const blocked = lead.status === "Unsubscribed";
            const expiryDays = daysUntil(lead.policy_expiry_date);
            const expirySoon = expiryDays !== null && expiryDays >= 2 && expiryDays <= 7;
            const expired = expiryDays !== null && expiryDays < 2;
            const isNext = autoNextId === lead.id;
            return (
              <Card
                key={lead.id}
                className={`overflow-hidden transition-all hover:shadow-elegant ${expirySoon ? "border-2 border-destructive bg-destructive/5" : overdue ? "border-primary/40" : ""} ${isNext ? "ring-2 ring-primary animate-pulse" : ""}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox className="mt-1" checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} onClick={(e) => e.stopPropagation()} />
                      <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{lead.customer_name}</h3>
                        <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
                        <Badge variant="outline">{lead.policy_type}</Badge>
                        {overdue && <Badge className="bg-primary text-primary-foreground">Overdue</Badge>}
                        {isNext && <Badge className="bg-primary text-primary-foreground"><ArrowRight className="h-3 w-3" /> Next</Badge>}
                        {expirySoon && (
                          <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                            <AlarmClock className="h-3 w-3" /> Expires in {expiryDays}d
                          </Badge>
                        )}
                        {expired && expiryDays !== null && expiryDays >= 0 && (
                          <Badge className="bg-destructive text-destructive-foreground">Expires today/tomorrow</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone_number}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.areas?.name ?? "—"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {lead.call_date}</span>
                        {Number(lead.premium_amount) > 0 && (
                          <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{Number(lead.premium_amount).toLocaleString("en-IN")}</span>
                        )}
                        {lead.policy_expiry_date && (
                          <span className={`flex items-center gap-1 ${expirySoon ? "font-semibold text-destructive" : ""}`}>
                            <AlarmClock className="h-3.5 w-3.5" /> Exp: {lead.policy_expiry_date}
                          </span>
                        )}
                        {lead.last_called_at && (
                          <span className="text-xs">Last: {new Date(lead.last_called_at).toLocaleString()}</span>
                        )}
                      </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
                      {!blocked && (
                        <Button asChild variant="hero" size="sm" className="relative" onClick={() => logDial(lead)}>
                          <a href={`tel:${lead.phone_number}`}>
                            <Phone className="h-4 w-4" /> Dial
                            {(dialCounts[lead.id] ?? 0) > 0 && (
                              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/90 px-1.5 text-[11px] font-bold text-primary">
                                {dialCounts[lead.id]}
                              </span>
                            )}
                          </a>
                        </Button>
                      )}
                      {!blocked && (
                        <Button variant="outline" size="sm" onClick={() => openDialHistory(lead)} title="Dialed numbers history">
                          <History className="h-4 w-4" /> Dialed ({dialCounts[lead.id] ?? 0})
                        </Button>
                      )}
                      {!blocked && (
                        <Button asChild variant="success" size="sm">
                          <a href={`https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${waMessage(lead.customer_name)}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" /> WhatsApp
                          </a>
                        </Button>
                      )}
                      {!blocked && (
                        <Button asChild variant="outline" size="sm">
                          <a href={`https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${waQuote(lead.customer_name)}`} target="_blank" rel="noopener noreferrer">
                            Quote
                          </a>
                        </Button>
                      )}
                      {!blocked && (
                        <Button asChild variant="outline" size="sm">
                          <a href={`https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${waThanks(lead.customer_name)}`} target="_blank" rel="noopener noreferrer">
                            Thanks
                          </a>
                        </Button>
                      )}
                      {!blocked && (
                        <Button asChild variant="outline" size="sm">
                          <a href={`sms:${lead.phone_number}?body=${smsMessage}`}><MessageSquare className="h-4 w-4" /> SMS</a>
                        </Button>
                      )}
                      <Select value={lead.status} onValueChange={(v) => { setNoteText(""); setNoteDialog({ lead, status: v as Status }); }}>
                        <SelectTrigger className="col-span-2 h-9 w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><History className="h-4 w-4" /> Timeline</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{lead.customer_name} — Timeline</DialogTitle>
                          </DialogHeader>
                          <LeadTimeline leadId={lead.id} />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm"><Ban className="h-4 w-4" /> DNC</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark as Do Not Call?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {lead.customer_name} ({lead.phone_number}) ko Unsubscribed mark kiya jayega. Ye lead calling list se hat jayegi aur dobara dial nahi hoga.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => unsubscribe(lead)}>Confirm DNC</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!historyLead} onOpenChange={(o) => !o && setHistoryLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dial History — {historyLead?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Number: <span className="font-mono font-semibold text-foreground">{historyLead?.phone_number}</span>
            </div>
            <div className="text-sm">Total dials: <span className="font-bold text-primary">{dialHistory.length}</span></div>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded border p-2">
              {dialHistory.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Abhi tak koi dial nahi.</p>
              ) : dialHistory.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5 text-xs">
                  <span>{new Date(d.clicked_at).toLocaleString()}</span>
                  <Badge variant={d.connected ? "default" : "outline"} className="text-[10px]">
                    {d.connected ? "Connected" : "Dialed"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note dialog after disposition */}
      <Dialog open={!!noteDialog} onOpenChange={(o) => !o && setNoteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a note — {noteDialog?.status}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{noteDialog?.lead.customer_name} — Customer ne kya kaha?</p>
            <Textarea
              placeholder="Customer said they will think about it..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={async () => { if (noteDialog) { await updateStatus(noteDialog.lead, noteDialog.status); setNoteDialog(null); } }}>Skip</Button>
              <Button variant="hero" onClick={async () => { if (noteDialog) { await updateStatus(noteDialog.lead, noteDialog.status, noteText.trim() || undefined); setNoteDialog(null); } }}>
                <CheckCircle2 className="h-4 w-4" /> Save Note & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BulkActionBar
        count={selectedIds.size}
        telecallers={telecallerList}
        onClear={() => setSelectedIds(new Set())}
        onDelete={async () => {
          const ids = [...selectedIds];
          await supabase.from("leads").delete().in("id", ids);
          toast({ title: `${ids.length} deleted` });
          setSelectedIds(new Set()); load();
        }}
        onMove={async (status) => {
          const ids = [...selectedIds];
          await supabase.from("leads").update({ status: status as any }).in("id", ids);
          toast({ title: `Moved to ${status}` });
          setSelectedIds(new Set()); load();
        }}
        onAssign={async (tid) => {
          const ids = [...selectedIds];
          await supabase.from("leads").update({ assigned_telecaller: tid }).in("id", ids);
          toast({ title: "Assigned" });
          setSelectedIds(new Set()); load();
        }}
      />
    </div>
  );
};

