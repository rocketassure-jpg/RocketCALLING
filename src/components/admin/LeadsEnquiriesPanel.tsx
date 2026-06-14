import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnquiriesPanel } from "@/components/EnquiriesPanel";
import { MobileNumberSearch } from "@/components/MobileNumberSearch";
import { Users, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export const LeadsEnquiriesPanel = ({ leadsView }: { leadsView: React.ReactNode }) => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Quick lookup</CardTitle></CardHeader>
      <CardContent>
        <MobileNumberSearch
          onPrefill={(h) => toast({ title: "Record mil gaya", description: `${h.customer_name} (${h.source}) — form me copy ho gaya` })}
          placeholder="Mobile number type karo — leads / customers / enquiries me dhundenge"
        />
      </CardContent>
    </Card>

    <Tabs defaultValue="leads" className="space-y-4">
      <TabsList>
        <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1" /> Leads</TabsTrigger>
        <TabsTrigger value="enquiries"><Inbox className="h-4 w-4 mr-1" /> Enquiries</TabsTrigger>
      </TabsList>
      <TabsContent value="leads">{leadsView}</TabsContent>
      <TabsContent value="enquiries"><EnquiriesPanel /></TabsContent>
    </Tabs>
  </div>
);
