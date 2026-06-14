import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RenewalQueue } from "@/components/admin/renewals/RenewalQueue";
import { RenewalCampaigns } from "@/components/admin/renewals/RenewalCampaigns";
import { RenewalTemplates } from "@/components/admin/renewals/RenewalTemplates";
import { RenewalAnalytics } from "@/components/admin/renewals/RenewalAnalytics";
import { RenewalSettings } from "@/components/admin/renewals/RenewalSettings";
import { AlarmClock, Megaphone, FileText, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const RenewalsPanel = () => {
  const { role, isSuperAdmin } = useAuth();
  const canManage = role === "admin" || role === "manager" || isSuperAdmin;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Renewals</h1>
        <p className="text-sm text-muted-foreground">Renewal queue, bulk campaigns, templates aur analytics — sab ek jagah.</p>
      </div>
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="queue"><AlarmClock className="h-4 w-4 mr-1" /> Queue</TabsTrigger>
          {canManage && <TabsTrigger value="campaigns"><Megaphone className="h-4 w-4 mr-1" /> Campaigns</TabsTrigger>}
          {canManage && <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-1" /> Templates</TabsTrigger>}
          {canManage && <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>}
          {canManage && <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" /> Settings</TabsTrigger>}
        </TabsList>
        <TabsContent value="queue"><RenewalQueue /></TabsContent>
        {canManage && <TabsContent value="campaigns"><RenewalCampaigns /></TabsContent>}
        {canManage && <TabsContent value="templates"><RenewalTemplates /></TabsContent>}
        {canManage && <TabsContent value="analytics"><RenewalAnalytics /></TabsContent>}
        {canManage && <TabsContent value="settings"><RenewalSettings /></TabsContent>}
      </Tabs>
    </div>
  );
};
