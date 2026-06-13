import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, FileText, Wind, ClipboardCheck, ScrollText, BookOpen } from "lucide-react";
import { VehiclesList } from "./VehiclesList";
import { MotorPoliciesList } from "./MotorPoliciesList";
import { ExpiryTracker } from "./ExpiryTracker";

export const MotorPanel = () => {
  const [tab, setTab] = useState("policies");
  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Motor Insurance</h2>
        <p className="text-sm text-muted-foreground">Vehicles, policies, PUC, fitness, permits and RC tracking.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="policies"><FileText className="mr-1 h-4 w-4" /> Policies</TabsTrigger>
          <TabsTrigger value="vehicles"><Car className="mr-1 h-4 w-4" /> Vehicles</TabsTrigger>
          <TabsTrigger value="puc"><Wind className="mr-1 h-4 w-4" /> PUC</TabsTrigger>
          <TabsTrigger value="fitness"><ClipboardCheck className="mr-1 h-4 w-4" /> Fitness</TabsTrigger>
          <TabsTrigger value="permit"><ScrollText className="mr-1 h-4 w-4" /> Permit</TabsTrigger>
          <TabsTrigger value="rc"><BookOpen className="mr-1 h-4 w-4" /> RC</TabsTrigger>
        </TabsList>
        <TabsContent value="policies" className="mt-4"><MotorPoliciesList /></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><VehiclesList /></TabsContent>
        <TabsContent value="puc" className="mt-4">
          <ExpiryTracker
            table="puc_records"
            title="PUC Certificates"
            expiryColumn="expiry_date"
            extraFields={[
              { key: "certificate_number", label: "Cert No" },
              { key: "test_center", label: "Test Center" },
              { key: "issue_date", label: "Issue Date", type: "date" },
            ]}
          />
        </TabsContent>
        <TabsContent value="fitness" className="mt-4">
          <ExpiryTracker
            table="fitness_certificates"
            title="Fitness Certificates"
            expiryColumn="expiry_date"
            extraFields={[
              { key: "certificate_number", label: "Cert No" },
              { key: "rto_office", label: "RTO Office" },
              { key: "issue_date", label: "Issue Date", type: "date" },
            ]}
          />
        </TabsContent>
        <TabsContent value="permit" className="mt-4">
          <ExpiryTracker
            table="permits"
            title="Permits"
            expiryColumn="expiry_date"
            extraFields={[
              { key: "permit_number", label: "Permit No" },
              { key: "permit_type", label: "Type" },
              { key: "states_covered", label: "States" },
              { key: "issue_date", label: "Issue Date", type: "date" },
            ]}
          />
        </TabsContent>
        <TabsContent value="rc" className="mt-4">
          <ExpiryTracker
            table="rc_register"
            title="RC Register"
            expiryColumn="rc_expiry_date"
            extraFields={[
              { key: "rc_number", label: "RC No" },
              { key: "rto_office", label: "RTO Office" },
              { key: "rc_status", label: "Status" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
