import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Tabs removed in favor of hamburger sections
import { Users, IndianRupee, PhoneCall, ThumbsUp, Ban, BarChart3, Phone, Inbox, AlarmClock, Trophy, GraduationCap, Calculator } from "lucide-react";
import { CallingList } from "@/components/CallingList";
import { EnquiriesPanel } from "@/components/EnquiriesPanel";
import { UserActionMenu } from "@/components/UserActionMenu";
import { TrainingModule } from "@/components/TrainingModule";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { InstallPWA } from "@/components/InstallPWA";
import { ManagerTeamPanel } from "@/components/ManagerTeamPanel";
import { RenewalsPanel } from "@/components/admin/RenewalsPanel";
import { CustomersPanel } from "@/components/admin/CustomersPanel";

type Profile = { id: string; full_name: string };
type Lead = { id: string; customer_name: string; phone_number: string; status: string; premium_amount: number; call_date: string; area_id: string; areas?: { name: string } | null };
type CallLog = { telecaller_id: string; status: string; called_at: string };
type DialLog = { telecaller_id: string };

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [showTraining, setShowTraining] = useState(false);
  const [section, setSection] = useState("calling");
  const [me, setMe] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [dialLogs, setDialLogs] = useState<DialLog[]>([]);

  const load = async () => {
    if (!user) return;
    const [meR, teamR, leadsR, callR, dialR] = await Promise.all([
      supabase.from("profiles").select("id,full_name").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("id,full_name").eq("manager_id", user.id),
      supabase.from("leads").select("id,customer_name,phone_number,status,premium_amount,call_date,area_id, areas(name)"),
      supabase.from("call_logs").select("telecaller_id,status,called_at"),
      supabase.from("dial_logs").select("telecaller_id"),
    ]);
    setMe(meR.data ?? null);
    setTeam(teamR.data ?? []);
    setLeads((leadsR.data ?? []) as any);
    setCallLogs(callR.data ?? []);
    setDialLogs(dialR.data ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const teamStats = useMemo(() => {
    return team.map((t) => {
      const calls = callLogs.filter((c) => c.telecaller_id === t.id).length;
      const dials = dialLogs.filter((d) => d.telecaller_id === t.id).length;
      const interested = callLogs.filter((c) => c.telecaller_id === t.id && c.status === "Interested").length;
      const unsubscribed = callLogs.filter((c) => c.telecaller_id === t.id && c.status === "Unsubscribed").length;
      const done = callLogs.filter((c) => c.telecaller_id === t.id && c.status === "Done").length;
      return { ...t, calls, dials, interested, unsubscribed, done };
    });
  }, [team, callLogs, dialLogs]);

  const totals = useMemo(() => ({
    teamSize: team.length,
    totalCalls: callLogs.length,
    totalDials: dialLogs.length,
    interested: callLogs.filter((c) => c.status === "Interested").length,
    unsubscribed: leads.filter((l) => l.status === "Unsubscribed").length,
    premium: leads.filter((l) => l.status === "Done").reduce((s, l) => s + Number(l.premium_amount || 0), 0),
  }), [team, callLogs, dialLogs, leads]);

  const activeLeads = leads.filter((l) => l.status !== "Unsubscribed");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <HamburgerMenu
              items={[
                { id: "calling", label: "Calling List", icon: Phone },
                { id: "leads", label: "My Leads", icon: Users },
                { id: "team", label: "My Team", icon: BarChart3 },
                { id: "renewals", label: "Renewals", icon: AlarmClock },
                { id: "customers", label: "Customers", icon: Trophy },
                { id: "enquiries", label: "Enquiries", icon: Inbox },
                { id: "training", label: "Training", icon: GraduationCap },
              ]}
              active={showTraining ? "training" : section}
              onChange={(id) => { if (id === "training") { setShowTraining(true); } else { setShowTraining(false); setSection(id); } }}
              userName={me?.full_name}
            />
            <Logo />
            <Badge variant="secondary" className="hidden sm:inline-flex">Manager</Badge>
          </div>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <UserActionMenu label={me?.full_name} onTraining={() => setShowTraining(true)} />
          </div>
        </div>
      </header>

      <main className="container space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6">
        {showTraining && (
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setShowTraining(false)}>← Back to dashboard</Button>
            <TrainingModule canManage={false} />
          </div>
        )}
        {!showTraining && (<>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Team</div><div className="mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-bold text-primary"><Users className="h-4 w-4 sm:h-5 sm:w-5" />{totals.teamSize}</div></CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Dials</div><div className="mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-bold"><PhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />{totals.totalDials}</div></CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Dispositions</div><div className="mt-1 text-lg sm:text-2xl font-bold">{totals.totalCalls}</div></CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Interested</div><div className="mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-bold text-success"><ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5" />{totals.interested}</div></CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Unsubscribed</div><div className="mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-bold text-destructive"><Ban className="h-4 w-4 sm:h-5 sm:w-5" />{totals.unsubscribed}</div></CardContent></Card>
          <Card><CardContent className="p-3 sm:p-4"><div className="text-[11px] sm:text-xs text-muted-foreground">Premium</div><div className="mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-bold text-primary"><IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />{totals.premium.toLocaleString("en-IN")}</div></CardContent></Card>
        </div>

        {section === "calling" && <CallingList callerName={me?.full_name || "Rocket Services"} role="manager" />}
        {section === "enquiries" && <EnquiriesPanel />}
        {section === "team" && <ManagerTeamPanel />}
        {section === "renewals" && <RenewalsPanel />}
        {section === "customers" && <CustomersPanel />}
        {section === "leads" && (
          <Card>
            <CardHeader><CardTitle>Active leads in your team's areas ({activeLeads.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead>
                  <TableHead>Status</TableHead><TableHead>Call date</TableHead><TableHead className="text-right">Premium</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {activeLeads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.customer_name}</TableCell>
                      <TableCell>{l.phone_number}</TableCell>
                      <TableCell>{l.areas?.name}</TableCell>
                      <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                      <TableCell>{l.call_date}</TableCell>
                      <TableCell className="text-right">{fmt(Number(l.premium_amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        </>)}
      </main>
    </div>
  );
};

export default ManagerDashboard;
