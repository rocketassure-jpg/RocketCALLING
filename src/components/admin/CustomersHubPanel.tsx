import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomersPanel } from "@/components/admin/CustomersPanel";
import { Customer360Panel } from "@/components/admin/customers360/Customer360Panel";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { MobileNumberSearch } from "@/components/MobileNumberSearch";
import { PoliciesServicesPanel } from "@/components/admin/PoliciesServicesPanel";
import { Trophy, UserPlus, Users, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const CustomersHubPanel = ({ areas, telecallers, onDone }: { areas: any[]; telecallers: any[]; onDone: () => void }) => (
  <Tabs defaultValue="add" className="space-y-4">
    <TabsList className="flex h-auto flex-wrap">
      <TabsTrigger value="add"><UserPlus className="h-4 w-4 mr-1" /> 1. Add Customer</TabsTrigger>
      <TabsTrigger value="c360"><Users className="h-4 w-4 mr-1" /> 2. Customer 360</TabsTrigger>
      <TabsTrigger value="policies"><ShieldCheck className="h-4 w-4 mr-1" /> 3. Policies &amp; Services</TabsTrigger>
      <TabsTrigger value="won"><Trophy className="h-4 w-4 mr-1" /> Customers Won</TabsTrigger>
    </TabsList>
    <TabsContent value="add">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Step 1 — Add customer details (search first to avoid duplicates)</CardTitle></CardHeader>
          <CardContent><MobileNumberSearch placeholder="Pehle mobile dhundo — duplicate avoid karo" /></CardContent>
        </Card>
        <AddCustomerForm areas={areas} telecallers={telecallers} onDone={onDone} />
        <p className="text-xs text-muted-foreground text-center">After saving the customer, open <strong>Customer 360</strong> and click <strong>+ Add Product</strong> to attach Motor / Health / Life / RTO / Finance.</p>
      </div>
    </TabsContent>
    <TabsContent value="c360"><Customer360Panel /></TabsContent>
    <TabsContent value="policies"><PoliciesServicesPanel /></TabsContent>
    <TabsContent value="won"><CustomersPanel /></TabsContent>
  </Tabs>
);
