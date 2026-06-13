import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Target, Wallet, Calculator, GitCompare } from "lucide-react";
import { BrokersList } from "./BrokersList";
import { BrokerTargets } from "./BrokerTargets";
import { BrokerPayouts } from "./BrokerPayouts";
import { SlabSimulator } from "./SlabSimulator";
import { BrokerComparison } from "./BrokerComparison";

export const BrokerPanel = () => {
  const [tab, setTab] = useState("brokers");
  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Brokers & Payouts</h2>
        <p className="text-sm text-muted-foreground">Manage brokers, targets, slabs, achievements and reconciliation.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="brokers"><Briefcase className="mr-1 h-4 w-4" /> Brokers</TabsTrigger>
          <TabsTrigger value="targets"><Target className="mr-1 h-4 w-4" /> Targets & Slabs</TabsTrigger>
          <TabsTrigger value="payouts"><Wallet className="mr-1 h-4 w-4" /> Payouts</TabsTrigger>
          <TabsTrigger value="simulator"><Calculator className="mr-1 h-4 w-4" /> Simulator</TabsTrigger>
          <TabsTrigger value="compare"><GitCompare className="mr-1 h-4 w-4" /> Compare</TabsTrigger>
        </TabsList>
        <TabsContent value="brokers" className="mt-4"><BrokersList /></TabsContent>
        <TabsContent value="targets" className="mt-4"><BrokerTargets /></TabsContent>
        <TabsContent value="payouts" className="mt-4"><BrokerPayouts /></TabsContent>
        <TabsContent value="simulator" className="mt-4"><SlabSimulator /></TabsContent>
        <TabsContent value="compare" className="mt-4"><BrokerComparison /></TabsContent>
      </Tabs>
    </div>
  );
};
