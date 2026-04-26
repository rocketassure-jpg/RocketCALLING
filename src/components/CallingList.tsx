import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageCircle, MessageSquare, Search, Loader2, MapPin, Ban, Calendar, IndianRupee } from "lucide-react";

type Lead = {
  id: string;
  customer_name: string;
  phone_number: string;
  policy_type: "Life" | "Health" | "Motor";
  status: "New" | "Interested" | "Follow-up" | "Not Picked" | "Not Interested" | "Unsubscribed" | "Done";
  last_called_at: string | null;
  call_date: string;
  premium_amount: number;
  area_id: string;
  areas?: { name: string } | null;
};

const STATUSES = ["New", "Interested", "Follow-up", "Not Picked", "Not Interested", "Done"] as const;

const statusColor = (s: string) => {
  switch (s) {
    case "Interested": return "bg-success text-success-foreground";
    case "Done": return "bg-primary text-primary-foreground";
    case "Follow-up": return "bg-warning text-warning-foreground";
    case "Not Picked": return "bg-muted text-muted-foreground";
    case "Not Interested": return "bg-destructive text-destructive-foreground";
    case "Unsubscribed": return "bg-destructive text-destructive-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
};

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (d: string) => d < today();

export const CallingList = ({ callerName = "Rocket Services" }: { callerName?: string }) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id,customer_name,phone_number,policy_type,status,last_called_at,call_date,premium_amount,area_id, areas(name)")
      .lte("call_date", today())
      .not("status", "in", "(Unsubscribed,Done)")
      .order("call_date", { ascending: true });
    if (error) toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    setLeads((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (lead: Lead, newStatus: typeof STATUSES[number]) => {
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("leads").update({ status: newStatus, last_called_at: now }).eq("id", lead.id);
    if (e1) return toast({ title: "Update failed", description: e1.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: newStatus });
    toast({ title: "Saved", description: `${lead.customer_name} → ${newStatus}` });
    if (newStatus === "Done") setLeads((prev) => prev.filter((l) => l.id !== lead.id));
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
  };

  const waMessage = (name: string) =>
    encodeURIComponent(`Namaste ${name}, main Rocket Services se ${callerName} baat kar raha hoon. Aapke liye ek special insurance plan hai. Kya aap 2 minute baat kar sakte hain?`);
  const smsMessage = encodeURIComponent(`Namaste, Rocket Services se ${callerName}. Hum aapko ek special insurance offer dene ke liye call karna chahte hain.`);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return l.customer_name.toLowerCase().includes(q) || l.phone_number.includes(q);
  });

  const stats = {
    total: leads.length,
    overdue: leads.filter((l) => isOverdue(l.call_date)).length,
    interested: leads.filter((l) => l.status === "Interested").length,
    followup: leads.filter((l) => l.status === "Follow-up").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "To call today", value: stats.total, color: "text-primary" },
          { label: "Overdue", value: stats.overdue, color: "text-destructive" },
          { label: "Interested", value: stats.interested, color: "text-success" },
          { label: "Follow-up", value: stats.followup, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          🎉 Aaj ke liye koi pending lead nahi hai. Shabaash!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const overdue = isOverdue(lead.call_date);
            const blocked = lead.status === "Unsubscribed";
            return (
              <Card key={lead.id} className={`overflow-hidden transition-shadow hover:shadow-elegant ${overdue ? "border-primary/40" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{lead.customer_name}</h3>
                        <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
                        <Badge variant="outline">{lead.policy_type}</Badge>
                        {overdue && <Badge className="bg-primary text-primary-foreground">Overdue</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone_number}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.areas?.name ?? "—"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {lead.call_date}</span>
                        {Number(lead.premium_amount) > 0 && (
                          <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{Number(lead.premium_amount).toLocaleString("en-IN")}</span>
                        )}
                        {lead.last_called_at && (
                          <span className="text-xs">Last: {new Date(lead.last_called_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!blocked && (
                        <Button asChild variant="hero" size="sm" onClick={() => logDial(lead)}>
                          <a href={`tel:${lead.phone_number}`}><Phone className="h-4 w-4" /> Dial</a>
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
                          <a href={`sms:${lead.phone_number}?body=${smsMessage}`}><MessageSquare className="h-4 w-4" /> SMS</a>
                        </Button>
                      )}
                      <Select value={lead.status} onValueChange={(v) => updateStatus(lead, v as any)}>
                        <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
    </div>
  );
};
