import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp } from "lucide-react";

type E = { id: string; stage: string; source_ref: string | null; notes: string | null; occurred_at: string };

const STAGE_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  lead: "outline", prospect: "outline", customer: "secondary", policy_holder: "default",
  multi_product: "default", renewal: "secondary", claim: "destructive", loyal: "default",
};

export const LifecycleTab = ({ customerId }: { customerId: string }) => {
  const [rows, setRows] = useState<E[]>([]);
  useEffect(() => {
    (supabase as any).from("customer_lifecycle_events").select("*").eq("customer_id", customerId).order("occurred_at", { ascending: false }).then(({ data }: any) => setRows(data ?? []));
  }, [customerId]);

  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No lifecycle events yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Full lifecycle history</p>
      <div className="relative pl-4 border-l-2 border-muted space-y-3">
        {rows.map((e) => (
          <div key={e.id} className="relative">
            <div className="absolute -left-[21px] top-2 h-3 w-3 rounded-full bg-primary" />
            <Card><CardContent className="p-3 flex items-start justify-between gap-3">
              <div>
                <Badge variant={STAGE_COLOR[e.stage] ?? "outline"} className="mb-1"><Activity className="h-3 w-3 mr-1" /> {e.stage}</Badge>
                {e.notes && <p className="text-sm">{e.notes}</p>}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.occurred_at).toLocaleString()}</span>
            </CardContent></Card>
          </div>
        ))}
      </div>
    </div>
  );
};
