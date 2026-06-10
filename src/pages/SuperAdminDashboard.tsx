import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Power, Loader2, ShieldCheck, LogOut, Copy } from "lucide-react";

type Company = { id: string; name: string; code: string; plan: string; is_active: boolean; created_at: string; notes: string | null };
type Module = { module_key: string; name: string; base_monthly_price: number; base_yearly_price: number; is_always_included: boolean; sort_order: number };
type Subscription = { id: string; company_id: string; module_key: string; billing_cycle: string; status: string; start_date: string; end_date: string | null; price_paid: number; notes: string | null };

const SuperAdminDashboard = () => {
  const { signOut, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCo, setNewCo] = useState({ name: "", code: "", plan: "custom" });

  const load = async () => {
    setLoading(true);
    const [c, m, s] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.from("company_subscriptions").select("*"),
    ]);
    setCompanies((c.data ?? []) as any);
    setModules((m.data ?? []) as any);
    setSubs((s.data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createCompany = async () => {
    if (!newCo.name || !newCo.code) return toast({ title: "Name + code required", variant: "destructive" });
    const code = newCo.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const { data, error } = await supabase.from("companies").insert({
      name: newCo.name, code, plan: newCo.plan, created_by: user?.id,
    }).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    // seed base bundle
    await supabase.from("company_subscriptions").insert(
      modules.filter((m) => m.is_always_included).map((m) => ({
        company_id: (data as any).id, module_key: m.module_key, billing_cycle: "lifetime", status: "active",
      }))
    );
    toast({ title: "Company created", description: `Code: ${code}` });
    setCreating(false); setNewCo({ name: "", code: "", plan: "custom" });
    load();
  };

  const toggleModule = async (companyId: string, moduleKey: string, currentSub: Subscription | undefined) => {
    if (currentSub) {
      await supabase.from("company_subscriptions").delete().eq("id", currentSub.id);
      toast({ title: `Module disabled` });
    } else {
      await supabase.from("company_subscriptions").insert({
        company_id: companyId, module_key: moduleKey, billing_cycle: "monthly", status: "active",
      });
      toast({ title: `Module enabled` });
    }
    load();
  };

  const updateSub = async (subId: string, patch: Partial<Subscription>) => {
    await supabase.from("company_subscriptions").update(patch as any).eq("id", subId);
    load();
  };

  const subsFor = (companyId: string) => subs.filter((s) => s.company_id === companyId);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><Logo /><Badge variant="destructive">Super Admin</Badge></div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
      </header>

      <main className="container space-y-4 px-3 py-4 sm:px-4 sm:py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Companies ({companies.length})</CardTitle>
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New Company</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create company</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newCo.name} onChange={(e) => setNewCo({ ...newCo, name: e.target.value })} placeholder="XYZ Insurance Broker" /></div>
                  <div><Label>Code (signup key)</Label><Input value={newCo.code} onChange={(e) => setNewCo({ ...newCo, code: e.target.value.toUpperCase() })} placeholder="XYZBROKER" /></div>
                  <div><Label>Plan</Label>
                    <Select value={newCo.plan} onValueChange={(v) => setNewCo({ ...newCo, plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="base">Base pack</SelectItem>
                        <SelectItem value="all">All modules</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={createCompany}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Plan</TableHead>
                    <TableHead>Modules</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((co) => {
                    const cSubs = subsFor(co.id);
                    return (
                      <TableRow key={co.id}>
                        <TableCell className="font-medium">{co.name}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{co.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => { navigator.clipboard.writeText(co.code); toast({ title: "Code copied" }); }}><Copy className="h-3 w-3" /></Button>
                        </TableCell>
                        <TableCell><Badge variant="outline">{co.plan}</Badge></TableCell>
                        <TableCell>{cSubs.length}/{modules.length}</TableCell>
                        <TableCell>{co.is_active ? <Badge>Active</Badge> : <Badge variant="destructive">Disabled</Badge>}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelected(co)}>Modules</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{selected.name} — Module Access</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {modules.map((m) => {
                  const sub = subsFor(selected.id).find((s) => s.module_key === m.module_key);
                  const enabled = !!sub;
                  return (
                    <div key={m.module_key} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg border p-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">{m.name}{m.is_always_included && <Badge variant="secondary" className="text-[10px]">Always</Badge>}</div>
                        <div className="text-xs text-muted-foreground">{m.module_key} • ₹{m.base_monthly_price}/mo</div>
                      </div>
                      <Select value={sub?.billing_cycle ?? "monthly"} disabled={!enabled} onValueChange={(v) => sub && updateSub(sub.id, { billing_cycle: v })}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="lifetime">Lifetime</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="date" className="w-36 h-8" value={sub?.end_date ?? ""} disabled={!enabled} onChange={(e) => sub && updateSub(sub.id, { end_date: e.target.value || null })} />
                      <Badge variant={enabled ? "default" : "outline"}>{enabled ? sub!.status : "off"}</Badge>
                      <Switch checked={enabled} onCheckedChange={() => toggleModule(selected.id, m.module_key, sub)} disabled={m.is_always_included && enabled} />
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
