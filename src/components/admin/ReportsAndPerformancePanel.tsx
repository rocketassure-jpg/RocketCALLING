import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Trophy } from "lucide-react";
import { ReportsPanel } from "@/components/admin/reports/ReportsPanel";
import { PerformancePanel } from "@/components/admin/PerformancePanel";

export const ReportsAndPerformancePanel = () => {
  const [tab, setTab] = useState<"reports" | "performance">("reports");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "reports" ? "hero" : "outline"} onClick={() => setTab("reports")}>
          <BarChart3 className="h-4 w-4" /> Reports
        </Button>
        <Button size="sm" variant={tab === "performance" ? "hero" : "outline"} onClick={() => setTab("performance")}>
          <Trophy className="h-4 w-4" /> Performance
        </Button>
      </div>
      {tab === "reports" ? <ReportsPanel /> : <PerformancePanel />}
    </div>
  );
};
