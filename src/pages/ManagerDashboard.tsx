import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, IndianRupee, PhoneCall, ThumbsUp, Ban, BarChart3, Phone, Inbox } from "lucide-react";
import { CallingList } from "@/components/CallingList";
import { EnquiriesPanel } from "@/components/EnquiriesPanel";

type Profile = { id: string; full_name: string };
type Lead = { id: string; customer_name: string; phone_number: string; status: string; premium_amount: number; call_date: string; area_id: string; areas?: { name: string } | null };
type CallLog = { telecaller_id: string; status: string; called_at: string };
type DialLog = { telecaller_id: string };

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const ManagerDashboard = () => {
  const { user, signOut } = useAuth();
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
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="secondary">Manager</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{me?.full_name}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Team</div><div className="mt-1 flex items-center gap-2 text-2xl font-bold text-primary"><Users className="h-5 w-5" />{totals.teamSize}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Dials</div><div className="mt-1 flex items-center gap-2 text-2xl font-bold"><PhoneCall className="h-5 w-5" />{totals.totalDials}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Dispositions</div><div className="mt-1 text-2xl font-bold">{totals.totalCalls}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Interested</div><div className="mt-1 flex items-center gap-2 text-2xl font-bold text-success"><ThumbsUp className="h-5 w-5" />{totals.interested}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unsubscribed</div><div className="mt-1 flex items-center gap-2 text-2xl font-bold text-destructive"><Ban className="h-5 w-5" />{totals.unsubscribed}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Premium</div><div className="mt-1 flex items-center gap-2 text-2xl font-bold text-primary"><IndianRupee className="h-5 w-5" />{totals.premium.toLocaleString("en-IN")}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="calling">
          <TabsList>
            <TabsTrigger value="calling"><Phone className="mr-2 h-4 w-4" />Calling</TabsTrigger>
            <TabsTrigger value="enquiries"><Inbox className="mr-2 h-4 w-4" />New enquiries</TabsTrigger>
            <TabsTrigger value="team"><BarChart3 className="mr-2 h-4 w-4" />Team performance</TabsTrigger>
            <TabsTrigger value="leads">Team leads</TabsTrigger>
          </TabsList>

          <TabsContent value="calling">
            <CallingList callerName={me?.full_name || "Rocket Services"} />
          </TabsContent>

          <TabsContent value="enquiries">
            <EnquiriesPanel />
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader><CardTitle>Per-telecaller performance</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Telecaller</TableHead>
                    <TableHead className="text-right">Dials</TableHead>
                    <TableHead className="text-right">Calls logged</TableHead>
                    <TableHead className="text-right">Interested</TableHead>
                    <TableHead className="text-right">Done</TableHead>
                    <TableHead className="text-right">Unsubscribed</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {teamStats.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No telecallers assigned to you yet.</TableCell></TableRow>
                    ) : teamStats.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.full_name || "(no name)"}</TableCell>
                        <TableCell className="text-right">{t.dials}</TableCell>
                        <TableCell className="text-right">{t.calls}</TableCell>
                        <TableCell className="text-right text-success">{t.interested}</TableCell>
                        <TableCell className="text-right text-primary">{t.done}</TableCell>
                        <TableCell className="text-right text-destructive">{t.unsubscribed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ManagerDashboard;
