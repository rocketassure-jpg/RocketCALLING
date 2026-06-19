import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Building2, Landmark, MapPin, Award, BarChart3, Sparkles, Shield } from "lucide-react";
import { VendorsList } from "@/components/admin/vendor/VendorsList";
import { PriorityEngine } from "@/components/admin/vendor/PriorityEngine";
import { VendorPerformance } from "@/components/admin/vendor/VendorPerformance";

export const VendorManagementPanel = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Vendor Management</h2>
        <p className="text-sm text-muted-foreground">Brokers, POSP, corporate agents, banks, NBFCs, RTO partners, surveyors, TPAs — full profile, commissions, documents, ratings & priority engine.</p>
      </div>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="all"><Briefcase className="mr-1 h-4 w-4" /> All Vendors</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="mr-1 h-4 w-4" /> Companies</TabsTrigger>
          <TabsTrigger value="brokers"><Shield className="mr-1 h-4 w-4" /> Brokers</TabsTrigger>
          <TabsTrigger value="finance"><Landmark className="mr-1 h-4 w-4" /> Finance Partners</TabsTrigger>
          <TabsTrigger value="rto"><MapPin className="mr-1 h-4 w-4" /> RTO Partners</TabsTrigger>
          <TabsTrigger value="priority"><Sparkles className="mr-1 h-4 w-4" /> Priority Engine</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="mr-1 h-4 w-4" /> Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><VendorsList /></TabsContent>
        <TabsContent value="companies"><VendorsList initialType="insurance_company" /></TabsContent>
        <TabsContent value="brokers"><VendorsList initialType="broker" /></TabsContent>
        <TabsContent value="finance"><VendorsList initialType="finance_bank" /></TabsContent>
        <TabsContent value="rto"><VendorsList initialType="rto" /></TabsContent>
        <TabsContent value="priority"><PriorityEngine /></TabsContent>
        <TabsContent value="performance"><VendorPerformance /></TabsContent>
      </Tabs>
    </div>
  );
};
