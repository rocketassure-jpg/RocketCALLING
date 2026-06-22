import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

type S = { id: string; missing_category: string; score: number; reason: string };

const LABELS: Record<string, string> = {
  motor: "Motor Insurance", health: "Health Insurance", life: "Life Insurance", term: "Term Insurance",
  travel: "Travel", property: "Property", fire: "Fire", marine: "Marine", shopkeeper: "Shopkeeper",
  liability: "Liability", sip: "SIP", mutual_fund: "Mutual Fund", fd: "Fixed Deposit",
  personal_loan: "Personal Loan", home_loan: "Home Loan", business_loan: "Business Loan",
  credit_card: "Credit Card", fastag: "FASTag", rsa: "RSA",
};

export const CrossSellWidget = ({ customerId }: { customerId: string }) => {
  const [rows, setRows] = useState<S[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("cross_sell_suggestions").select("*").eq("customer_id", customerId).order("score", { ascending: false }).limit(8);
    setRows((data ?? []) as S[]);
  };
  useEffect(() => { load(); }, [customerId]);

  const recompute = async () => {
    setBusy(true);
    await (supabase as any).rpc("compute_cross_sell", { _customer_id: customerId });
    await load();
    setBusy(false);
  };

  if (!rows.length) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground flex items-center justify-between">
        <span><Sparkles className="inline h-4 w-4 mr-1" /> No cross-sell suggestions yet.</span>
        <Button size="sm" variant="outline" onClick={recompute} disabled={busy}><RefreshCw className="h-3 w-3 mr-1" /> Compute</Button>
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cross-Sell Opportunities</h3>
          <Button size="sm" variant="ghost" onClick={recompute} disabled={busy}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {rows.map((s) => (
            <Badge key={s.id} variant={s.score >= 80 ? "default" : "secondary"} className="px-3 py-1">
              {LABELS[s.missing_category] ?? s.missing_category}
              <span className="ml-2 text-[10px] opacity-75">{s.score}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
