import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LeadTimeline } from "@/components/LeadTimeline";
import { toast } from "@/hooks/use-toast";
import {
  Phone, ChevronDown, MessageCircle, MessageSquare, FileText, MoreHorizontal,
  History, Loader2, StickyNote, Info, HandHeart, Ban, IndianRupee, PhoneOutgoing,
} from "lucide-react";

type Status = string;

type LeadLite = {
  id: string;
  customer_name: string;
  phone_number: string;
  policy_type: string;
  status: Status;
  call_date: string;
  premium_amount: number;
  areas?: { name: string } | null;
  assigned_telecaller?: string | null;
};

type Props = {
  lead: LeadLite;
  blocked: boolean;
  dialCount: number;
  statusOptions: string[];
  callerName: string;
  onDial: () => void;
  onStatusChange: (s: Status) => void;
  onUnsubscribe: () => void;
};

type Tab = "notes" | "timeline" | "details" | "thanks" | "dnc";

const TAB_BTN = "min-h-[44px] text-xs sm:text-sm";

export const LeadActions = ({
  lead, blocked, dialCount, statusOptions, callerName,
  onDial, onStatusChange, onUnsubscribe,
}: Props) => {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notes");

  // Dial history popover
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ clicked_at: string; connected: boolean }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notes tab
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Thanks tab
  const defaultThanks = `Namaste ${lead.customer_name} ji! Aapka samay dene ke liye dhanyavaad. Rocket Services ki taraf se aapko best policy offer milegi.`;
  const [thanksMsg, setThanksMsg] = useState(defaultThanks);

  // Assigned name (loaded on Details tab)
  const [assignedName, setAssignedName] = useState<string | null>(null);

  useEffect(() => {
    if (!historyOpen) return;
    setHistoryLoading(true);
    supabase
      .from("dial_logs")
      .select("clicked_at,connected")
      .eq("lead_id", lead.id)
      .order("clicked_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data ?? []) as any);
        setHistoryLoading(false);
      });
  }, [historyOpen, lead.id]);

  useEffect(() => {
    if (tab !== "details" || !lead.assigned_telecaller || assignedName) return;
    supabase.from("profiles").select("full_name").eq("id", lead.assigned_telecaller).maybeSingle()
      .then(({ data }) => setAssignedName(data?.full_name ?? "—"));
  }, [tab, lead.assigned_telecaller, assignedName]);

  const saveNote = async () => {
    if (!note.trim() || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from("lead_notes").insert({ lead_id: lead.id, author_id: user.id, note: note.trim() });
    setSavingNote(false);
    if (error) return toast({ title: "Note save fail", description: error.message, variant: "destructive" });
    setNote("");
    toast({ title: "Note saved" });
  };

  const waLink = (msg: string) =>
    `https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  const smsLink = (msg: string) => `sms:${lead.phone_number}?body=${encodeURIComponent(msg)}`;

  const quoteMsg = `Namaste ${lead.customer_name} ji, Rocket Services se quote bhej rahe hain. Aapke liye best premium rate ready hai — confirm kariye to policy aaj hi process ho jayegi.`;

  return (
    <div className="w-full space-y-2">
      {/* Row 1: Dial (split) + WhatsApp */}
      {!blocked && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex">
            <Button
              asChild
              variant="hero"
              size="sm"
              className="min-h-[44px] flex-1 rounded-r-none"
              onClick={onDial}
            >
              <a href={`tel:${lead.phone_number}`}>
                <Phone className="h-4 w-4" /> Dial
                {dialCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/90 px-1.5 text-[11px] font-bold text-primary">
                    {dialCount}
                  </span>
                )}
              </a>
            </Button>
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="hero"
                  size="sm"
                  className="min-h-[44px] rounded-l-none border-l border-background/30 px-2"
                  title="Call history"
                  aria-label="Call history"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Call history — {history.length} calls
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {historyLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                  ) : history.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Abhi tak koi dial nahi.</p>
                  ) : (
                    history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-0">
                        <div className="min-w-0">
                          <div className="text-xs text-foreground">{new Date(h.clicked_at).toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">Dialed from app</div>
                        </div>
                        <Badge variant={h.connected ? "default" : "outline"} className={`text-[10px] ${h.connected ? "bg-success text-success-foreground" : ""}`}>
                          {h.connected ? "Answered" : "Not picked"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button asChild variant="success" size="sm" className="min-h-[44px]">
            <a
              href={waLink(`Namaste ${lead.customer_name}, main Rocket Services se ${callerName} baat kar raha hoon. Aapke liye ek special insurance plan hai. Kya aap 2 minute baat kar sakte hain?`)}
              target="_blank" rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </div>
      )}

      {/* Row 2: SMS / Quote / More */}
      {!blocked && (
        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" size="sm" className={TAB_BTN}>
            <a href={smsLink(`Namaste, Rocket Services se ${callerName}. Hum aapko ek special insurance offer dene ke liye call karna chahte hain.`)}>
              <MessageSquare className="h-4 w-4" /> SMS
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className={TAB_BTN}>
            <a href={waLink(quoteMsg)} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" /> Quote
            </a>
          </Button>
          <Button
            variant={moreOpen ? "default" : "outline"}
            size="sm"
            className={TAB_BTN}
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="h-4 w-4" /> More
          </Button>
        </div>
      )}

      {/* Row 3: Status select + dialed count */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <Select value={lead.status} onValueChange={(v) => onStatusChange(v as Status)}>
          <SelectTrigger className="min-h-[44px] w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
          <PhoneOutgoing className="h-3.5 w-3.5" /> {dialCount} dialed
        </div>
      </div>

      {/* More panel */}
      {moreOpen && (
        <div className="mt-2 rounded-lg border bg-card">
          <div className="grid grid-cols-5 border-b">
            {([
              { id: "notes", label: "Notes", icon: StickyNote },
              { id: "timeline", label: "Timeline", icon: History },
              { id: "details", label: "Details", icon: Info },
              { id: "thanks", label: "Thanks", icon: HandHeart },
              { id: "dnc", label: "DNC", icon: Ban },
            ] as { id: Tab; label: string; icon: any }[]).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-1.5 text-[10px] font-medium transition-colors sm:text-xs ${
                    active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 text-sm">
            {tab === "notes" && (
              <div className="space-y-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Customer ne kya kaha? Note karo…"
                  rows={3}
                />
                <Button size="sm" onClick={saveNote} disabled={savingNote || !note.trim()}>
                  {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
                  Save Note
                </Button>
              </div>
            )}

            {tab === "timeline" && <LeadTimeline leadId={lead.id} />}

            {tab === "details" && (
              <dl className="divide-y text-sm">
                <Row k="Policy type" v={lead.policy_type} />
                <Row k="Area" v={lead.areas?.name ?? "—"} />
                <Row k="Call date" v={lead.call_date} />
                <Row k="Premium" v={
                  <span className="inline-flex items-center">
                    <IndianRupee className="h-3.5 w-3.5" />{Number(lead.premium_amount || 0).toLocaleString("en-IN")}
                  </span>
                } />
                <Row k="Status" v={<Badge variant="secondary">{lead.status}</Badge>} />
                <Row k="Assigned to" v={lead.assigned_telecaller ? (assignedName ?? "Loading…") : "Unassigned"} />
              </dl>
            )}

            {tab === "thanks" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Customer ko thanks message bhejo:</p>
                <Textarea value={thanksMsg} onChange={(e) => setThanksMsg(e.target.value)} rows={4} />
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="success" size="sm" className="min-h-[44px]">
                    <a href={waLink(thanksMsg)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                    <a href={smsLink(thanksMsg)}>
                      <MessageSquare className="h-4 w-4" /> SMS
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {tab === "dnc" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center">
                <p className="mb-2 text-sm text-destructive">
                  Is lead ko Do Not Call list mein add karna chahte ho? Dobara dial nahi hoga.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="min-h-[44px]">
                      <Ban className="h-4 w-4" /> Haan, DNC mein dalo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as Do Not Call?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {lead.customer_name} ({lead.phone_number}) ko Unsubscribed mark kiya jayega. Ye lead calling list se hat jayegi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onUnsubscribe}>Confirm DNC</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between py-1.5">
    <dt className="text-xs text-muted-foreground">{k}</dt>
    <dd className="text-sm font-medium text-foreground">{v}</dd>
  </div>
);
