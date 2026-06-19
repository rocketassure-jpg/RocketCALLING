import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, HeartPulse, ShieldCheck, Building2 } from "lucide-react";
import { MotorPanel } from "@/components/admin/motor/MotorPanel";
import { HealthPanel } from "@/components/admin/health/HealthPanel";
import { LifePanel } from "@/components/admin/life/LifePanel";
import { RtoPanel } from "@/components/admin/rto/RtoPanel";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export const PoliciesServicesPanel = () => {
  const { has } = useModuleAccess();
  const tabs = [
    { id: "motor", label: "Motor Insurance", icon: Car, enabled: has("motor_insurance"), node: <MotorPanel /> },
    { id: "health", label: "Health Insurance", icon: HeartPulse, enabled: has("health_insurance"), node: <HealthPanel /> },
    { id: "life", label: "Life Insurance", icon: ShieldCheck, enabled: has("life_insurance"), node: <LifePanel /> },
    { id: "rto", label: "RTO Services", icon: Building2, enabled: has("rto_services"), node: <RtoPanel /> },
  ].filter((t) => t.enabled);

  if (!tabs.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No policy modules enabled.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Policies &amp; Services</h2>
        <p className="text-sm text-muted-foreground">Manage all insurance products and RTO services in one place.</p>
      </div>
      <Tabs defaultValue={tabs[0].id} className="space-y-4">
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
