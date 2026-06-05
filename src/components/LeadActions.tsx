import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LeadTimeline } from "@/components/LeadTimeline";
import { toast } from "@/hooks/use-toast";
import { fillTemplate, MessageTemplate } from "@/components/TemplatesManager";
import {
  Phone, ChevronDown, MessageCircle, MessageSquare, FileText, MoreHorizontal,
  History, Loader2, StickyNote, Info, Ban, IndianRupee, PhoneOutgoing, Send,
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
  policy_expiry_date?: string | null;
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

type Tab = "notes" | "timeline" | "details" | "template" | "dnc";

const statusPillColor = (s: string) => {
  switch (s) {
    case "Interested":
    case "Converted": return "bg-success text-success-foreground border-success";
    case "Quote Sent":
    case "Transfer to Senior": return "bg-accent text-accent-foreground border-accent";
    case "Premium Quoted":
    case "Negotiation":
    case "Follow-up": return "bg-warning text-warning-foreground border-warning";
    case "Done": return "bg-primary text-primary-foreground border-primary";
    case "Not Picked": return "bg-muted text-muted-foreground border-border";
    case "Not Interested":
    case "Unsubscribed": return "bg-destructive text-destructive-foreground border-destructive";
    default: return "bg-secondary text-secondary-foreground border-border";
  }
};

const IconBtn = ({
  label, onClick, asChild, href, target, rel, className = "", children,
}: {
  label: string; onClick?: () => void; asChild?: boolean; href?: string; target?: string; rel?: string;
  className?: string; children: React.ReactNode;
}) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        {asChild && href ? (
          <a
            href={href} target={target} rel={rel} onClick={onClick}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 ${className}`}
            aria-label={label}
          >
            {children}
          </a>
        ) : (
          <button
            type="button" onClick={onClick}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 ${className}`}
            aria-label={label}
          >
            {children}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent><p>{label}</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const LeadActions = ({
  lead, blocked, dialCount, statusOptions, callerName,
  onDial, onStatusChange, onUnsubscribe,
}: Props) => {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notes");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ clicked_at: string; connected: boolean }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateBody, setTemplateBody] = useState("");
  const [tplLoading, setTplLoading] = useState(false);

  const [assignedName, setAssignedName] = useState<string | null>(null);

  const templateVars = useMemo(() => ({
    name: lead.customer_name,
    vehicle: lead.policy_type,
    policy_date: lead.policy_expiry_date ?? lead.call_date,
    agent_name: callerName,
  }), [lead, callerName]);

  // Load dial history when popover opens
  useEffect(() => {
    if (!historyOpen) return;
    setHistoryLoading(true);
    supabase.from("dial_logs").select("clicked_at,connected").eq("lead_id", lead.id)
      .order("clicked_at", { ascending: false }).limit(20)
      .then(({ data }) => { setHistory((data ?? []) as any); setHistoryLoading(false); });
  }, [historyOpen, lead.id]);

  // Load assigned profile name
  useEffect(() => {
    if (tab !== "details" || !lead.assigned_telecaller || assignedName) return;
    supabase.from("profiles").select("full_name").eq("id", lead.assigned_telecaller).maybeSingle()
      .then(({ data }) => setAssignedName(data?.full_name ?? "—"));
  }, [tab, lead.assigned_telecaller, assignedName]);

  // Load templates when Template tab opens
  useEffect(() => {
    if (tab !== "template" || templates.length) return;
    setTplLoading(true);
    supabase.from("message_templates").select("*").order("title")
      .then(({ data }) => {
        const list = (data ?? []) as MessageTemplate[];
        setTemplates(list); setTplLoading(false);
        if (list[0]) { setSelectedTemplateId(list[0].id); setTemplateBody(fillTemplate(list[0].body, templateVars)); }
      });
  }, [tab, templates.length, templateVars]);

  const onPickTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setTemplateBody(fillTemplate(t.body, templateVars));
  };

  const saveNote = async () => {
    if (!note.trim() || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from("lead_notes").insert({ lead_id: lead.id, author_id: user.id, note: note.trim() });
    setSavingNote(false);
    if (error) return toast({ title: "Note save fail", description: error.message, variant: "destructive" });
    setNote(""); toast({ title: "Note saved" });
  };

  const waLink = (msg: string) =>
    `https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  const smsLink = (msg: string) => `sms:${lead.phone_number}?body=${encodeURIComponent(msg)}`;

  const introMsg = `Namaste ${lead.customer_name}, main Rocket Services se ${callerName}. Aapke liye special insurance plan hai. 2 minute baat ho sakti hai?`;
  const smsMsg = `Namaste, Rocket Services se ${callerName}. Special insurance offer aapke liye ready hai.`;
  const quoteMsg = `Namaste ${lead.customer_name} ji, Rocket Services se quote bhej rahe hain. Best premium rate ready — confirm karein to policy aaj hi process ho jaye.`;

  return (
    <div className="w-full space-y-2">
      {/* Single-row compact action bar */}
      {!blocked && (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Dial pill - left = call, right = history */}
          <div className="flex items-center rounded-full bg-destructive text-destructive-foreground shadow-soft">
            <a
              href={`tel:${lead.phone_number}`}
              onClick={onDial}
              className="flex h-11 items-center gap-1.5 rounded-l-full pl-3.5 pr-2.5 text-sm font-semibold transition-all active:scale-95"
              aria-label="Dial"
            >
              <Phone className="h-4 w-4" /> Dial
              {dialCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/95 px-1.5 text-[11px] font-bold text-destructive">
                  {dialCount}
                </span>
              )}
            </a>
            <div className="h-6 w-px bg-destructive-foreground/30" />
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center rounded-r-full px-2.5 transition-all active:scale-95"
                  aria-label="Call history"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-0">
                <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Call history — {history.length} calls
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {historyLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                  ) : history.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Abhi tak koi dial nahi.</p>
                  ) : history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-0">
                      <div className="min-w-0">
                        <div className="text-xs text-foreground">{new Date(h.clicked_at).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">Dialed from app</div>
                      </div>
                      <Badge variant={h.connected ? "default" : "outline"} className={`text-[10px] ${h.connected ? "bg-success text-success-foreground" : ""}`}>
                        {h.connected ? "Answered" : "Not picked"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Disposition dropdown pill */}
          <Select value={lead.status} onValueChange={(v) => onStatusChange(v as Status)}>
            <SelectTrigger className={`h-11 min-w-[140px] flex-1 rounded-full border px-3 text-xs font-semibold ${statusPillColor(lead.status)}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Icon-only action buttons */}
          <IconBtn
            label="WhatsApp" asChild href={waLink(introMsg)} target="_blank" rel="noopener noreferrer"
            className="bg-success text-success-foreground hover:opacity-90"
          ><MessageCircle className="h-5 w-5" /></IconBtn>

          <IconBtn
            label="SMS" asChild href={smsLink(smsMsg)}
            className="bg-muted text-muted-foreground hover:bg-muted/80"
          ><MessageSquare className="h-5 w-5" /></IconBtn>

          <IconBtn
            label="Send quote" asChild href={waLink(quoteMsg)} target="_blank" rel="noopener noreferrer"
            className="bg-warning text-warning-foreground hover:opacity-90"
          ><FileText className="h-5 w-5" /></IconBtn>

          <IconBtn
            label={moreOpen ? "Hide details" : "More options"}
            onClick={() => setMoreOpen((v) => !v)}
            className={moreOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}
          ><MoreHorizontal className="h-5 w-5" /></IconBtn>
        </div>
      )}

      {/* Dial counter */}
      {!blocked && dialCount > 0 && (
        <div className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          <PhoneOutgoing className="h-3 w-3" /> {dialCount} dialed
        </div>
      )}

      {/* More panel */}
      {moreOpen && (
        <div className="mt-2 rounded-lg border bg-card">
          <div className="grid grid-cols-5 border-b">
            {([
              { id: "notes", label: "Notes", icon: StickyNote },
              { id: "timeline", label: "Timeline", icon: History },
              { id: "details", label: "Details", icon: Info },
              { id: "template", label: "Template", icon: FileText },
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
                  <Icon className="h-4 w-4" />{t.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 text-sm">
            {tab === "notes" && (
              <div className="space-y-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Customer ne kya kaha?" rows={3} />
                <Button size="sm" onClick={saveNote} disabled={savingNote || !note.trim()} className="min-h-[44px]">
                  {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />} Save Note
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
                  <span className="inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(lead.premium_amount || 0).toLocaleString("en-IN")}</span>
                } />
                <Row k="Status" v={<Badge variant="secondary">{lead.status}</Badge>} />
                <Row k="Assigned to" v={lead.assigned_telecaller ? (assignedName ?? "Loading…") : "Unassigned"} />
              </dl>
            )}

            {tab === "template" && (
              <div className="space-y-2">
                {tplLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                ) : templates.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Koi template nahi mila. Account Settings se add karo.
                  </p>
                ) : (
                  <>
                    <Select value={selectedTemplateId} onValueChange={onPickTemplate}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select template" /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title} <span className="ml-1 text-[10px] text-muted-foreground">({t.category})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} rows={5} />
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="success" size="sm" className="min-h-[44px]">
                        <a href={waLink(templateBody)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                        <a href={smsLink(templateBody)}>
                          <Send className="h-4 w-4" /> SMS
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "dnc" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center">
                <p className="mb-2 text-sm text-destructive">
                  Is lead ko Do Not Call list mein add karna chahte ho? Dobara dial nahi hoga.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="min-h-[44px]"><Ban className="h-4 w-4" /> Haan, DNC mein dalo</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as Do Not Call?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {lead.customer_name} ({lead.phone_number}) ko Unsubscribed mark kiya jayega.
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
