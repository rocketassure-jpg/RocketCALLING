import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle, MessageSquare, ShieldCheck, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

type Row = { kind: string; at: string; title: string; detail: string | null; ref_id: string };
type Summary = {
  products_count: number; lifetime_premium: number; lifetime_commission: number;
  claims_count: number; claims_settled_total: number;
  renewals_count: number; next_renewal_date: string | null;
  calls_count: number; last_call_at: string | null;
  whatsapp_count: number; sms_count: number;
};

const ICONS: Record<string, any> = {
  call: Phone, whatsapp: MessageCircle, sms: MessageSquare,
  policy: ShieldCheck, claim: AlertTriangle, renewal: RefreshCw,
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const CustomerTimelineDialog = ({ customerId, customerName, open, onOpenChange }: {
  customerId: string | null; customerName?: string; open: boolean; onOpenChange: (o: boolean) => void;
}) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    Promise.all([
      (supabase as any).from("v_customer_timeline").select("kind,at,title,detail,ref_id")
        .eq("customer_id", customerId).order("at", { ascending: false }).limit(200),
      (supabase as any).from("v_customer_360").select("*").eq("customer_id", customerId).maybeSingle(),
    ]).then(([t, s]) => {
      setRows((t.data ?? []) as Row[]);
      setSummary((s.data ?? null) as Summary | null);
    }).finally(() => setLoading(false));
  }, [open, customerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Timeline — {customerName ?? "Customer"}</DialogTitle></DialogHeader>

        {summary && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Policies</div><div className="text-lg font-semibold">{summary.products_count}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Lifetime Premium</div><div className="text-lg font-semibold">{inr(summary.lifetime_premium)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Claims Settled</div><div className="text-lg font-semibold">{inr(summary.claims_settled_total)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Next Renewal</div><div className="text-sm font-semibold">{summary.next_renewal_date ?? "—"}</div></CardContent></Card>
          </div>
        )}

        {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

        {!loading && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet for this customer.</p>
        )}

        <div className="space-y-2">
          {rows.map((r) => {
            const Icon = ICONS[r.kind] ?? Phone;
            return (
              <div key={`${r.kind}-${r.ref_id}`} className="flex items-start gap-3 rounded border p-2 text-sm">
                <Icon className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.kind}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 truncate font-medium">{r.title}</div>
                  {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
