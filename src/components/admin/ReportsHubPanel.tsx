import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Trophy, AlarmClock, Car, Wallet } from "lucide-react";
import { Range } from "@/components/admin/reports/utils";
import { LeadCallingReports } from "@/components/admin/reports/categories/LeadCallingReports";
import { ProductivityReports } from "@/components/admin/reports/categories/ProductivityReports";
import { RenewalReports } from "@/components/admin/reports/categories/RenewalReports";
import { PolicyProductReports } from "@/components/admin/reports/categories/PolicyProductReports";
import { FinancialReports } from "@/components/admin/reports/categories/FinancialReports";

export const ReportsHubPanel = () => {
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const dp = { range, customFrom, customTo };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Date Range</Label>
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {range === "custom" && (
            <>
              <div className="space-y-1.5"><Label className="text-xs">From</Label><Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">To</Label><Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="lead_calling" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lead_calling"><Phone className="h-4 w-4 mr-1" /> Lead &amp; Calling</TabsTrigger>
          <TabsTrigger value="productivity"><Trophy className="h-4 w-4 mr-1" /> Productivity &amp; Agent</TabsTrigger>
          <TabsTrigger value="renewal"><AlarmClock className="h-4 w-4 mr-1" /> Renewal &amp; Pipeline</TabsTrigger>
          <TabsTrigger value="policy"><Car className="h-4 w-4 mr-1" /> Policy &amp; Product</TabsTrigger>
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 mr-1" /> Financial &amp; Payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="lead_calling"><LeadCallingReports {...dp} /></TabsContent>
        <TabsContent value="productivity"><ProductivityReports {...dp} /></TabsContent>
        <TabsContent value="renewal"><RenewalReports {...dp} /></TabsContent>
        <TabsContent value="policy"><PolicyProductReports {...dp} /></TabsContent>
        <TabsContent value="financial"><FinancialReports {...dp} /></TabsContent>
      </Tabs>
    </div>
  );
};
