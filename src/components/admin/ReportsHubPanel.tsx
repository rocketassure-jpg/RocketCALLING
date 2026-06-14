import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallReportsPanel } from "@/components/admin/CallReportsPanel";
import { ReportsAndPerformancePanel } from "@/components/admin/ReportsAndPerformancePanel";
import { Phone, BarChart3 } from "lucide-react";

export const ReportsHubPanel = () => (
  <Tabs defaultValue="calls" className="space-y-4">
    <TabsList>
      <TabsTrigger value="calls"><Phone className="h-4 w-4 mr-1" /> Call Reports</TabsTrigger>
      <TabsTrigger value="perf"><BarChart3 className="h-4 w-4 mr-1" /> Reports &amp; Performance</TabsTrigger>
    </TabsList>
    <TabsContent value="calls"><CallReportsPanel /></TabsContent>
    <TabsContent value="perf"><ReportsAndPerformancePanel /></TabsContent>
  </Tabs>
);
