import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tags, ListChecks } from "lucide-react";
import { CRMFieldsManager } from "@/components/admin/CRMFieldsManager";
import { StatusConfigurator } from "@/components/admin/StatusConfigurator";

export const FieldsAndStatusesPanel = () => {
  const [tab, setTab] = useState<"fields" | "statuses">("fields");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "fields" ? "hero" : "outline"} onClick={() => setTab("fields")}>
          <Tags className="h-4 w-4" /> CRM Fields
        </Button>
        <Button size="sm" variant={tab === "statuses" ? "hero" : "outline"} onClick={() => setTab("statuses")}>
          <ListChecks className="h-4 w-4" /> Statuses
        </Button>
      </div>
      {tab === "fields" ? <CRMFieldsManager /> : <StatusConfigurator />}
    </div>
  );
};
