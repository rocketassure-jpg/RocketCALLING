import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageCircle, MessageSquare, LogOut, Search, Loader2, MapPin, User as UserIcon } from "lucide-react";

type Lead = {
  id: string;
  customer_name: string;
  phone_number: string;
  policy_type: "Life" | "Health" | "Motor";
  status: "New" | "Interested" | "Follow-up" | "Not Picked" | "Not Interested";
  last_called_at: string | null;
  area_id: string;
  areas?: { name: string } | null;
};

const STATUSES = ["New", "Interested", "Follow-up", "Not Picked", "Not Interested"] as const;

const statusColor = (s: string) => {
  switch (s) {
    case "Interested": return "bg-success text-success-foreground";
    case "Follow-up": return "bg-warning text-warning-foreground";
    case "Not Picked": return "bg-muted text-muted-foreground";
    case "Not Interested": return "bg-destructive text-destructive-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
};

const TelecallerDashboard = () => {
  const { user, signOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id,customer_name,phone_number,policy_type,status,last_called_at,area_id, areas(name)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    setLeads((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (user) supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  const updateStatus = async (lead: Lead, newStatus: typeof STATUSES[number]) => {
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("leads").update({ status: newStatus, last_called_at: now }).eq("id", lead.id);
    if (e1) return toast({ title: "Update failed", description: e1.message, variant: "destructive" });
    if (user) await supabase.from("call_logs").insert({ lead_id: lead.id, telecaller_id: user.id, status: newStatus });
    toast({ title: "Saved", description: `${lead.customer_name} → ${newStatus}` });
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus, last_called_at: now } : l)));
  };

  const callerName = fullName || "Rocket Insurance";
  const waMessage = (name: string) =>
    encodeURIComponent(`Namaste ${name}, main Rocket Insurance se ${callerName} baat kar raha hoon. Aapke liye ek special insurance plan hai. Kya aap 2 minute baat kar sakte hain?`);
  const smsMessage = encodeURIComponent(`Namaste, Rocket Insurance se ${callerName}. Hum aapko ek special insurance offer dene ke liye call karna chahte hain.`);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return l.customer_name.toLowerCase().includes(q) || l.phone_number.includes(q);
  });

  const stats = {
    total: leads.length,
    interested: leads.filter((l) => l.status === "Interested").length,
    followup: leads.filter((l) => l.status === "Follow-up").length,
    new: leads.filter((l) => l.status === "New").length,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Hi, {fullName || "Telecaller"}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total leads", value: stats.total, color: "text-primary" },
            { label: "New", value: stats.new, color: "text-accent" },
            { label: "Interested", value: stats.interested, color: "text-success" },
            { label: "Follow-up", value: stats.followup, color: "text-warning" },
          ].map((s) => (
            <Card key={s.label}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent></Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Leads */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            No leads in your assigned areas yet. Ask your admin to assign you an area or add leads.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <Card key={lead.id} className="overflow-hidden transition-shadow hover:shadow-elegant">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{lead.customer_name}</h3>
                        <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
                        <Badge variant="outline">{lead.policy_type}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone_number}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.areas?.name ?? "—"}</span>
                        {lead.last_called_at && (
                          <span className="text-xs">Last called: {new Date(lead.last_called_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="hero" size="sm">
                        <a href={`tel:${lead.phone_number}`}><Phone className="h-4 w-4" /> Dial</a>
                      </Button>
                      <Button asChild variant="success" size="sm">
                        <a href={`https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=${waMessage(lead.customer_name)}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={`sms:${lead.phone_number}?body=${smsMessage}`}><MessageSquare className="h-4 w-4" /> SMS</a>
                      </Button>
                      <Select value={lead.status} onValueChange={(v) => updateStatus(lead, v as any)}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TelecallerDashboard;
