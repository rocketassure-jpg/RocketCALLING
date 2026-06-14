import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomersPanel } from "@/components/admin/CustomersPanel";
import { Customer360Panel } from "@/components/admin/customers360/Customer360Panel";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { MobileNumberSearch } from "@/components/MobileNumberSearch";
import { Trophy, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const CustomersHubPanel = ({ areas, telecallers, onDone }: { areas: any[]; telecallers: any[]; onDone: () => void }) => (
  <Tabs defaultValue="c360" className="space-y-4">
    <TabsList>
      <TabsTrigger value="c360"><Users className="h-4 w-4 mr-1" /> Customer 360</TabsTrigger>
      <TabsTrigger value="won"><Trophy className="h-4 w-4 mr-1" /> Customers Won</TabsTrigger>
      <TabsTrigger value="add"><UserPlus className="h-4 w-4 mr-1" /> Add Customer</TabsTrigger>
    </TabsList>
    <TabsContent value="c360"><Customer360Panel /></TabsContent>
    <TabsContent value="won"><CustomersPanel /></TabsContent>
    <TabsContent value="add">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Search first (mobile number)</CardTitle></CardHeader>
          <CardContent><MobileNumberSearch placeholder="Pehle mobile dhundo — duplicate avoid karo" /></CardContent>
        </Card>
        <AddCustomerForm areas={areas} telecallers={telecallers} onDone={onDone} />
      </div>
    </TabsContent>
  </Tabs>
);
