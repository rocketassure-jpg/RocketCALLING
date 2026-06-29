import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wallet } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  description: string | null;
  reference_id: string | null;
  paid_at: string | null;
  created_at: string;
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmt = (s: string | null) => s ? new Date(s).toLocaleString("en-IN") : "—";

export const PaymentsPanel = () => {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("payment_records")
        .select("id, amount, status, payment_method, payer_name, payer_phone, description, reference_id, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Payment[]);
      setLoading(false);
    })();
  }, []);

  const total = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = rows.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.amount || 0), 0);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Collected</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{inr(total)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{inr(pending)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Records</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Payment Records</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Payer</TableHead><TableHead>Amount</TableHead>
              <TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No payment records yet.</TableCell></TableRow>}
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmt(r.paid_at || r.created_at)}</TableCell>
                  <TableCell className="text-sm">{r.payer_name || "—"}<div className="text-xs text-muted-foreground">{r.payer_phone || ""}</div></TableCell>
                  <TableCell className="font-medium">{inr(r.amount)}</TableCell>
                  <TableCell className="text-xs uppercase">{r.payment_method || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status || "pending"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.reference_id || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
