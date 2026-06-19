import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const VendorPerformance = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const [v, t, r, rate] = await Promise.all([
        supabase.from("vendors").select("id,name,vendor_type,status"),
        supabase.from("policy_transactions").select("broker_id,gross_premium,commission_amount"),
        supabase.from("renewals").select("policy_type").limit(1000),
        supabase.from("vendor_ratings").select("vendor_id,overall"),
      ]);
      const vendors = v.data ?? [];
      const txns = t.data ?? [];
      const ratings = rate.data ?? [];
      const out = vendors.map((vd) => {
        const my = txns.filter((x: any) => x.broker_id === vd.id);
        const ratingsForV = ratings.filter((x: any) => x.vendor_id === vd.id);
        const avgRating = ratingsForV.length ? ratingsForV.reduce((s: number, x: any) => s + Number(x.overall || 0), 0) / ratingsForV.length : 0;
        return {
          ...vd,
          policies: my.length,
          premium: my.reduce((s, x: any) => s + Number(x.gross_premium || 0), 0),
          commission: my.reduce((s, x: any) => s + Number(x.commission_amount || 0), 0),
          avgRating,
        };
      }).sort((a, b) => b.premium - a.premium);
      setRows(out);
    })();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Vendor Performance Dashboard</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vendor</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
            <TableHead>Policies</TableHead><TableHead>Premium</TableHead>
            <TableHead>Commission</TableHead><TableHead>Rating</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline">{r.vendor_type}</Badge></TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell>{r.policies}</TableCell>
                <TableCell>₹{Number(r.premium).toLocaleString()}</TableCell>
                <TableCell>₹{Number(r.commission).toLocaleString()}</TableCell>
                <TableCell>{r.avgRating ? `${r.avgRating.toFixed(1)} ⭐` : "—"}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No vendor activity yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
