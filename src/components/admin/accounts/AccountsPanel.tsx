import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsurerMaster } from "./InsurerMaster";
import { CommissionRates } from "./CommissionRates";
import { AgentsList } from "./AgentsList";
import { PolicyTransactions } from "./PolicyTransactions";
import { CommissionTracker } from "./CommissionTracker";
import { AgentPayouts } from "./AgentPayouts";
import { Building2, Percent, Users, Receipt, LineChart, Wallet } from "lucide-react";

export const AccountsPanel = () => {
  const [tab, setTab] = useState("tracker");
  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Accounts</h2>
        <p className="text-sm text-muted-foreground">Insurers, commission, agents, transactions and payouts.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="tracker"><LineChart className="mr-1 h-4 w-4" /> Tracker</TabsTrigger>
          <TabsTrigger value="txn"><Receipt className="mr-1 h-4 w-4" /> Transactions</TabsTrigger>
          <TabsTrigger value="payouts"><Wallet className="mr-1 h-4 w-4" /> Payouts</TabsTrigger>
          <TabsTrigger value="insurers"><Building2 className="mr-1 h-4 w-4" /> Insurers</TabsTrigger>
          <TabsTrigger value="rates"><Percent className="mr-1 h-4 w-4" /> Rates</TabsTrigger>
          <TabsTrigger value="agents"><Users className="mr-1 h-4 w-4" /> Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-4"><CommissionTracker /></TabsContent>
        <TabsContent value="txn" className="mt-4"><PolicyTransactions /></TabsContent>
        <TabsContent value="payouts" className="mt-4"><AgentPayouts /></TabsContent>
        <TabsContent value="insurers" className="mt-4"><InsurerMaster /></TabsContent>
        <TabsContent value="rates" className="mt-4"><CommissionRates /></TabsContent>
        <TabsContent value="agents" className="mt-4"><AgentsList /></TabsContent>
      </Tabs>
    </div>
  );
};
