import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useMaskingPolicy } from "@/hooks/useMaskingPolicy";
import { Loader2, LogOut, Phone, Users, Eye, ShieldAlert } from "lucide-react";

const SubAgentDashboard = () => {
  const { user, signOut } = useAuth();
  const masking = useMaskingPolicy();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("leads")
        .select("id, customer_name, phone_number, policy_type, status, premium_amount, call_date")
        .eq("assigned_telecaller", user.id)
        .order("call_date", { ascending: true })
        .limit(100);
      setLeads(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const open = leads.filter((l) => !["Done", "Unsubscribed", "Not Interested"].includes(l.status));
  const won = leads.filter((l) => l.status === "Done");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 shadow-soft">
        <div className="flex items-center gap-2"><Logo /><Badge variant="secondary" className="gap-1"><ShieldAlert className="h-3 w-3" /> Sub-Agent</Badge></div>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Logout</Button>
      </header>

      <main className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><div className="text-xs text-muted-foreground">Assigned</div></div><div className="mt-1 text-2xl font-bold">{leads.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-warning" /><div className="text-xs text-muted-foreground">Open</div></div><div className="mt-1 text-2xl font-bold text-warning">{open.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Eye className="h-4 w-4 text-success" /><div className="text-xs text-muted-foreground">Won</div></div><div className="mt-1 text-2xl font-bold text-success">{won.length}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">My Leads (read-only)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {leads.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Koi leads assigned nahi.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                  <TableHead>Policy</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.customer_name}</TableCell>
                      <TableCell className="font-mono text-xs">{masking.display(l.phone_number)}</TableCell>
                      <TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                      <TableCell className="text-right">₹{Number(l.premium_amount || 0).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sub-Agent view: assigned leads dikhte hain. Editing/calling features admin se request karein.
        </p>
      </main>
    </div>
  );
};

export default SubAgentDashboard;
