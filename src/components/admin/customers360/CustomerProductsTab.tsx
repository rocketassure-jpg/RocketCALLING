import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, PackageSearch } from "lucide-react";
import { AddProductDialog } from "./AddProductDialog";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  category: string;
  sub_category: string | null;
  product_name: string | null;
  insurer_or_vendor: string | null;
  policy_no: string | null;
  premium: number;
  customer_price: number;
  commission_amount: number;
  agent_share: number;
  branch_share: number;
  admin_share: number;
  margin: number;
  profit: number;
  status: string;
  expiry_date: string | null;
};

const catBadge: Record<string, string> = {
  motor: "bg-blue-500/10 text-blue-600",
  health: "bg-emerald-500/10 text-emerald-600",
  life: "bg-purple-500/10 text-purple-600",
  fire: "bg-red-500/10 text-red-600",
  marine: "bg-cyan-500/10 text-cyan-600",
  shopkeeper: "bg-amber-500/10 text-amber-600",
  engineering: "bg-orange-500/10 text-orange-600",
  liability: "bg-pink-500/10 text-pink-600",
  rto: "bg-indigo-500/10 text-indigo-600",
  finance: "bg-teal-500/10 text-teal-600",
};

export const CustomerProductsTab = ({ customerId, customerName }: { customerId: string; customerName: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("customer_products")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await (supabase as any).from("customer_products").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    load();
  };

  // Group counts
  const counts = rows.reduce<Record<string, number>>((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {Object.entries(counts).map(([cat, n]) => (
            <Badge key={cat} variant="secondary" className={catBadge[cat] || ""}>
              {cat} ({n})
            </Badge>
          ))}
          {!rows.length && !loading && <span className="text-xs text-muted-foreground">No products yet.</span>}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3 w-3" /> Add Product</Button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
      ) : !rows.length ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <PackageSearch className="h-8 w-8 opacity-50" />
          Add the customer's first product to unlock the 360-view.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Company / Vendor</TableHead>
                <TableHead>Policy No</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Agent</TableHead>
                <TableHead className="text-right">Branch</TableHead>
                <TableHead className="text-right">Admin</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline" className={catBadge[r.category] || ""}>{r.category}</Badge></TableCell>
                    <TableCell className="text-xs">{r.sub_category ?? r.product_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.insurer_or_vendor ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.policy_no ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">₹{(r.premium || r.customer_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-medium">₹{(r.commission_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs text-emerald-600">₹{(r.agent_share || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs">₹{(r.branch_share || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs">₹{(r.admin_share || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.expiry_date ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddProductDialog
        customerId={customerId}
        customerName={customerName}
        open={open}
        onOpenChange={setOpen}
        onSaved={load}
      />
    </div>
  );
};
