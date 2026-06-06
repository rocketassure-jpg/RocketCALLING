import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Phone, Search, Loader2, MapPin, Calendar, IndianRupee, AlarmClock, ArrowRight, Sparkles, Flame, ThumbsUp, Clock, PhoneCall, CheckCircle2, X, PhoneOff, FileText, Calculator, Handshake, Trophy, ThumbsDown, CheckSquare, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Textarea } from "@/components/ui/textarea";
import { LeadActions } from "./LeadActions";
import { useLeadsPaginated, LeadBucket } from "@/hooks/useLeadsPaginated";
import { RevivalDateFilter, RevivalRange } from "@/components/RevivalDateFilter";
import { maskPhone } from "@/lib/utils";


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
    case "Interested":
    case "Converted": return "bg-success text-success-foreground";
    case "Quote Sent":
    case "Transfer to Senior": return "bg-accent text-accent-foreground";
    case "Premium Quoted":
    case "Negotiation":
    case "Follow-up": return "bg-warning text-warning-foreground";
    case "Done": return "bg-primary text-primary-foreground";
    case "Not Picked": return "bg-muted text-muted-foreground";
    case "Not Interested":
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

export const CallingList = ({ callerName = "Rocket Services", filterAssigned = false, role = "admin" }: { callerName?: string; filterAssigned?: boolean; role?: "admin" | "manager" | "telecaller" }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, parseInt(searchParams.get("page") ?? "1", 10) - 1);
  const pageSize = [20, 50, 100].includes(parseInt(searchParams.get("size") ?? "50", 10))
    ? parseInt(searchParams.get("size") ?? "50", 10)
    : 50;
  const revivalFromUrl = searchParams.get("revival_from");
  const revivalToUrl = searchParams.get("revival_to");
  const revivalLabelUrl = searchParams.get("revival_label");
  const revival: RevivalRange = revivalFromUrl && revivalToUrl
    ? { from: revivalFromUrl, to: revivalToUrl, label: revivalLabelUrl ?? revivalFromUrl }
    : null;

  const setRevival = (v: RevivalRange) => {
    const next = new URLSearchParams(searchParams);
    if (v) {
      next.set("revival_from", v.from);
      next.set("revival_to", v.to);
      next.set("revival_label", v.label);
    } else {
      next.delete("revival_from");
      next.delete("revival_to");
      next.delete("revival_label");
    }
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p + 1));
    setSearchParams(next, { replace: true });
  };
  const setPageSize = (s: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("size", String(s));
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const {
    leads, totalCount, loading,
    search, setSearch, bucket, setBucket, stats,
    reload, patchLead, removeLead, totalPages,
  } = useLeadsPaginated({
    role, userId: user?.id, filterAssigned,
    page, pageSize,
    revivalFrom: revival?.from ?? null,
    revivalTo: revival?.to ?? null,
  });

  const [autoNextId, setAutoNextId] = useState<string | null>(null);
  const [dialCounts, setDialCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [telecallerList, setTelecallerList] = useState<{ id: string; full_name: string }[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, interested: 0, followup: 0, notInterested: 0 });
  const [noteDialog, setNoteDialog] = useState<{ lead: Lead; status: Status } | null>(null);
  const [noteText, setNoteText] = useState("");


  // Telecaller list (for bulk assign)
  useEffect(() => {
    supabase.from("user_roles").select("user_id, profiles(id,full_name)").eq("role", "telecaller").then(({ data }) => {
      const list = (data ?? []).map((r: any) => r.profiles).filter(Boolean);
      setTelecallerList(list);
    });
  }, []);

  // Dial counts for currently loaded page only
  useEffect(() => {
    const ids = leads.map((l) => l.id);
    if (!ids.length) { setDialCounts({}); return; }
    supabase.from("dial_logs").select("lead_id").in("lead_id", ids).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { counts[r.lead_id] = (counts[r.lead_id] ?? 0) + 1; });
      setDialCounts(counts);
    });
  }, [leads]);

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

  useEffect(() => { loadTodayStats(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("call_logs_today")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs", filter: `telecaller_id=eq.${user.id}` }, () => loadTodayStats())
      .subscribe();
    const iv = setInterval(loadTodayStats, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [user?.id]);

  const toggleSelect = (id: string) => setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const updateStatus = async (lead: Lead, newStatus: Status, note?: string) => {
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("leads").update({ status: newStatus, last_called_at: now }).eq("id", lead.id);
    if (e1) return toast({ title: "Update failed", description: e1.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: newStatus, notes: note || null });
    toast({ title: "Saved", description: `${lead.customer_name} → ${newStatus}` });

    if (newStatus === "Interested") {
      const msg = `Hi ${lead.customer_name}, thank you for your interest in Rocket Services Insurance! Our team will contact you shortly with the best ${lead.policy_type} policy options. — Rocket Services`;
      supabase.functions.invoke("send-whatsapp", { body: { lead_id: lead.id, phone_number: lead.phone_number, template: "thank_you", message: msg } }).catch(() => {});
      supabase.functions.invoke("send-sms", { body: { lead_id: lead.id, phone_number: lead.phone_number, message: msg } }).catch(() => {});
    }

    // Auto-remove from calling list once any disposition is set (lead is no longer "untouched")
    removeLead(lead.id);
  };

  const unsubscribe = async (lead: Lead) => {
    const { error } = await supabase.from("leads").update({ status: "Unsubscribed", last_called_at: new Date().toISOString() }).eq("id", lead.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: "Unsubscribed" });
    toast({ title: "Marked DNC", description: `${lead.customer_name} ko ab call nahi lagega.` });
    removeLead(lead.id);
  };

  const logDial = async (lead: Lead) => {
    if (user) await supabase.from("dial_logs").insert({ lead_id: lead.id, telecaller_id: user.id });
    setDialCounts((prev) => ({ ...prev, [lead.id]: (prev[lead.id] ?? 0) + 1 }));
  };

  const buckets: { id: LeadBucket; label: string; value: number; accent: string; icon: any }[] = useMemo(() => ([
    { id: "today",              label: "To Call",         value: stats?.to_call            ?? 0, accent: "border-l-primary",          icon: PhoneCall },
    { id: "overdue",            label: "Overdue",         value: stats?.overdue            ?? 0, accent: "border-l-destructive",      icon: AlarmClock },
    { id: "untouched",          label: "Untouched",       value: stats?.untouched          ?? 0, accent: "border-l-warning",          icon: Sparkles },
    { id: "interested",         label: "Interested",      value: stats?.interested         ?? 0, accent: "border-l-success",          icon: ThumbsUp },
    { id: "followup",           label: "Follow-up",       value: stats?.follow_up          ?? 0, accent: "border-l-warning",          icon: Clock },
    { id: "cold",               label: "Cold",            value: stats?.cold               ?? 0, accent: "border-l-muted-foreground", icon: Flame },
    { id: "not_picked",         label: "Not Picked",      value: stats?.not_picked         ?? 0, accent: "border-l-muted-foreground", icon: PhoneOff },
    { id: "quote_sent",         label: "Quote Sent",      value: stats?.quote_sent         ?? 0, accent: "border-l-accent",           icon: FileText },
    { id: "premium_quoted",     label: "Premium",         value: stats?.premium_quoted     ?? 0, accent: "border-l-warning",          icon: Calculator },
    { id: "negotiation",        label: "Negotiation",     value: stats?.negotiation        ?? 0, accent: "border-l-warning",          icon: Handshake },
    { id: "converted",          label: "Converted",       value: stats?.converted          ?? 0, accent: "border-l-success",          icon: Trophy },
    { id: "transfer_to_senior", label: "Transfer",        value: stats?.transfer_to_senior ?? 0, accent: "border-l-accent",           icon: ArrowUpRight },
    { id: "not_interested",     label: "Not Int.",        value: stats?.not_interested     ?? 0, accent: "border-l-destructive",      icon: ThumbsDown },
    { id: "done",               label: "Done",            value: stats?.done               ?? 0, accent: "border-l-primary",          icon: CheckSquare },
  ]), [stats]);

  // Clear selections when leaving a page
  useEffect(() => { setSelectedIds(new Set()); }, [page, pageSize, bucket, revival?.from, revival?.to]);


  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-7">
        {buckets.map((b) => {
          const active = bucket === b.id;
          const Icon = b.icon;
          return (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              title={`Filter: ${b.label}`}
              className={`group flex flex-col rounded-lg border-l-[3px] ${b.accent} bg-card px-2 py-1.5 text-left shadow-card-pop transition-all duration-150 hover:shadow-elegant ${active ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">{b.label}</span>
              </div>
              <div className="mt-0.5 text-base font-extrabold tabular-nums leading-tight text-foreground">{b.value.toLocaleString("en-IN")}</div>
            </button>
          );
        })}
      </div>

      {/* Today's session card */}
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

      {/* Revival Date Filter */}
      <RevivalDateFilter value={revival} onChange={setRevival} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 rounded-full border-border/70 bg-card pl-10 pr-10 shadow-card-pop focus-visible:ring-primary/30"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results indicator */}
      <div className="flex items-center justify-between gap-2 px-1 text-sm">
        {leads.length > 0 ? (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={leads.length > 0 && leads.every((l) => selectedIds.has(l.id))}
              onCheckedChange={(v) => setSelectedIds(v ? new Set(leads.map((l) => l.id)) : new Set())}
            />
            <span className="text-muted-foreground">Select page ({leads.length})</span>
          </div>
        ) : <span />}
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `Page ${page + 1} of ${totalPages} · ${totalCount.toLocaleString("en-IN")} total`}
        </span>
      </div>


      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 rounded-xl border p-4">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="mt-3 flex gap-2">
                <div className="h-9 flex-1 rounded bg-muted" />
                <div className="h-9 flex-1 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          🎉 Koi pending lead nahi hai. Shabaash!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead: Lead) => {
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
                    <div className="flex flex-1 min-w-0 items-start gap-3">
                      <Checkbox className="mt-1" checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} onClick={(e) => e.stopPropagation()} />
                      <div className="min-w-0 flex-1">
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

                    <div className="w-full md:max-w-md md:flex-shrink-0">
                      <LeadActions
                        lead={lead as any}
                        blocked={blocked}
                        dialCount={dialCounts[lead.id] ?? 0}
                        statusOptions={STATUS_OPTIONS as any}
                        callerName={callerName}
                        onDial={() => logDial(lead)}
                        onStatusChange={(v) => { setNoteText(""); setNoteDialog({ lead, status: v as Status }); }}
                        onUnsubscribe={() => unsubscribe(lead)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}


      {/* Note dialog */}
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
        hideAssign={role === "telecaller"}
        hideDelete={role === "telecaller"}
        count={selectedIds.size}
        telecallers={telecallerList}
        onClear={() => setSelectedIds(new Set())}
        onDelete={async () => {
          const ids = [...selectedIds];
          await supabase.from("leads").delete().in("id", ids);
          toast({ title: `${ids.length} deleted` });
          setSelectedIds(new Set()); reload();
        }}
        onMove={async (status) => {
          const ids = [...selectedIds];
          await supabase.from("leads").update({ status: status as any }).in("id", ids);
          toast({ title: `Moved to ${status}` });
          setSelectedIds(new Set()); reload();
        }}
        onAssign={async (tid) => {
          const ids = [...selectedIds];
          await supabase.from("leads").update({ assigned_telecaller: tid }).in("id", ids);
          toast({ title: "Assigned" });
          setSelectedIds(new Set()); reload();
        }}
      />
    </div>
  );
};
