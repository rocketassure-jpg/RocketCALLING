import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Wrench, Building2, MapPin, Plus, Trash2, CreditCard } from "lucide-react";
import { AccountsPanel } from "@/components/admin/accounts/AccountsPanel";
import { BrokerPanel } from "@/components/admin/brokers/BrokerPanel";
import { OperationsPanel } from "@/components/admin/operations/OperationsPanel";
import { BranchesPanel } from "@/components/admin/branches/BranchesPanel";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const AreasPanel = () => {
  const { companyId } = useAuth();
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [newArea, setNewArea] = useState("");
  const load = async () => {
    const { data } = await supabase.from("areas").select("id,name").order("name");
    setAreas(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!newArea.trim() || !companyId) return;
    const { error } = await supabase.from("areas").insert({ name: newArea.trim(), company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewArea(""); load();
  };
  const del = async (id: string) => { await supabase.from("areas").delete().eq("id", id); load(); };
  return (
    <Card>
      <CardHeader><CardTitle>Manage areas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="New area name" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
          <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <Badge key={a.id} variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
              <MapPin className="h-3 w-3" /> {a.name}
              <button onClick={() => del(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const FinancePanel = () => {
  const { has } = useModuleAccess();
  const tabs = [
    { id: "accounts", label: "Accounts", icon: Wallet, show: has("accounts"), node: <AccountsPanel /> },
    { id: "brokers", label: "Brokers & Payouts", icon: Wallet, show: has("accounts"), node: <BrokerPanel /> },
    { id: "payments", label: "Payments", icon: CreditCard, show: true, node: <PaymentsPanel /> },
    { id: "operations", label: "Operations", icon: Wrench, show: true, node: <OperationsPanel /> },
    { id: "branches", label: "Branches", icon: Building2, show: true, node: <BranchesPanel /> },
    { id: "areas", label: "Areas", icon: MapPin, show: true, node: <AreasPanel /> },
  ].filter((t) => t.show);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Finance</h2>
        <p className="text-sm text-muted-foreground">Accounts, brokers, operations, branches and areas.</p>
      </div>
      <Tabs defaultValue={tabs[0]?.id} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="mr-1 h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.id} value={t.id}>{t.node}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
