import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Trophy, Coins, Star } from "lucide-react";

export const PriorityEngine = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [category, setCategory] = useState("motor");
  const [product, setProduct] = useState<string>("");
  const [premium, setPremium] = useState<number>(20000);

  useEffect(() => {
    (async () => {
      const [p, v, c, r] = await Promise.all([
        supabase.from("product_catalog").select("*").eq("is_active", true),
        supabase.from("vendors").select("*").eq("status", "active"),
        supabase.from("vendor_commissions").select("*").eq("is_active", true),
        supabase.from("vendor_ratings").select("vendor_id,overall"),
      ]);
      setProducts(p.data ?? []); setVendors(v.data ?? []); setCommissions(c.data ?? []); setRatings(r.data ?? []);
    })();
  }, []);

  const products4cat = products.filter((p) => p.category === category);
  const ratingMap = useMemo(() => {
    const m: Record<string, { sum: number; n: number }> = {};
    ratings.forEach((r) => { if (!m[r.vendor_id]) m[r.vendor_id] = { sum: 0, n: 0 }; m[r.vendor_id].sum += Number(r.overall || 0); m[r.vendor_id].n += 1; });
    return m;
  }, [ratings]);

  const rows = useMemo(() => {
    const relevant = commissions.filter((c) => c.product_category === category && (!product || !c.product_name || c.product_name === product));
    return relevant.map((c) => {
      const v = vendors.find((x) => x.id === c.vendor_id);
      if (!v) return null;
      const rate = c.commission_type === "percentage" ? c.rate
        : c.commission_type === "slab" ? c.rate
        : c.commission_type === "od_tp_split" ? ((Number(c.od_rate || 0) + Number(c.tp_rate || 0)) / 2)
        : null;
      const commissionAmount = c.commission_type === "fixed" ? Number(c.fixed_amount || 0)
        : rate != null ? Math.round(premium * rate / 100) : 0;
      const r = ratingMap[v.id];
      const avgRating = r && r.n ? r.sum / r.n : 0;
      return { vendor: v, rule: c, rate, commissionAmount, avgRating };
    }).filter(Boolean) as any[];
  }, [commissions, vendors, category, product, premium, ratingMap]);

  const bestCommission = rows.slice().sort((a, b) => b.commissionAmount - a.commissionAmount)[0];
  const bestPrice = rows.slice().sort((a, b) => a.commissionAmount - b.commissionAmount)[0]; // lowest comm = lowest customer price
  const bestOverall = rows.slice().sort((a, b) => {
    const sa = a.commissionAmount * 0.5 + a.avgRating * premium * 0.05;
    const sb = b.commissionAmount * 0.5 + b.avgRating * premium * 0.05;
    return sb - sa;
  })[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Vendor Priority Engine</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setProduct(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["motor","health","life","fire","marine","shopkeeper","liability","rto","finance"].map((c) =>
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Product (optional)</label>
            <Select value={product || "all"} onValueChange={(v) => setProduct(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products4cat.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Premium ₹</label>
            <Input type="number" value={premium} onChange={(e) => setPremium(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Coins className="h-4 w-4 text-emerald-500" /> Best Commission</CardTitle></CardHeader>
          <CardContent>
            {bestCommission ? <>
              <p className="text-lg font-bold">{bestCommission.vendor.name}</p>
              <p className="text-sm text-muted-foreground">₹{bestCommission.commissionAmount.toLocaleString()} earned</p>
            </> : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 text-blue-500" /> Best Customer Price</CardTitle></CardHeader>
          <CardContent>
            {bestPrice ? <>
              <p className="text-lg font-bold">{bestPrice.vendor.name}</p>
              <p className="text-sm text-muted-foreground">Lowest payout = best price for customer</p>
            </> : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-amber-500" /> Best Overall</CardTitle></CardHeader>
          <CardContent>
            {bestOverall ? <>
              <p className="text-lg font-bold">{bestOverall.vendor.name}</p>
              <p className="text-sm text-muted-foreground">Balance of commission + rating</p>
            </> : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All matching vendors</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead><TableHead>Type</TableHead><TableHead>Rule</TableHead>
              <TableHead>Rate</TableHead><TableHead>Commission ₹</TableHead><TableHead>Rating</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.vendor.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.vendor.vendor_type}</Badge></TableCell>
                  <TableCell className="capitalize text-xs">{r.rule.commission_type.replace("_", " ")}</TableCell>
                  <TableCell>{r.rate != null ? `${r.rate}%` : `₹${r.rule.fixed_amount}`}</TableCell>
                  <TableCell className="font-semibold">₹{r.commissionAmount.toLocaleString()}</TableCell>
                  <TableCell>{r.avgRating ? `${r.avgRating.toFixed(1)} ⭐` : "—"}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No vendor commission rules for this product yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
