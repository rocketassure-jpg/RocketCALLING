import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, IndianRupee, Phone, MessageCircle, Search } from "lucide-react";

type Customer = {
  id: string; customer_name: string; phone_number: string; policy_type: string;
  premium_amount: number; updated_at: string; policy_expiry_date: string | null;
  assigned_telecaller: string | null; areas?: { name: string } | null;
};

export const CustomersPanel = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [thisMonth, setThisMonth] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("leads").select("id,customer_name,phone_number,policy_type,premium_amount,updated_at,policy_expiry_date,assigned_telecaller, areas(name)")
        .eq("status", "Done").order("updated_at", { ascending: false });
      setCustomers((data ?? []) as any);
      const p = await supabase.from("profiles").select("id,full_name");
      setProfiles(Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x.full_name])));
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      setThisMonth((data ?? []).filter((c: any) => new Date(c.updated_at) >= start).length);
    })();
  }, []);

  const filtered = useMemo(() => customers.filter((c) =>
    !search || c.customer_name.toLowerCase().includes(search.toLowerCase()) || c.phone_number.includes(search)
  ), [customers, search]);

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-success">
        <CardContent className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customers this month</div>
              <div className="text-2xl font-extrabold">{thisMonth}</div>
            </div>
          </div>
          <Badge variant="secondary">Total: {customers.length}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Customers (Policy Done)</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Koi customer nahi mila.</p> :
            filtered.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 border-l-success bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.customer_name}</span>
                    <Badge variant="outline">{c.policy_type}</Badge>
                    <Badge className="bg-success text-success-foreground"><IndianRupee className="h-3 w-3" />{Number(c.premium_amount || 0).toLocaleString("en-IN")}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.phone_number} · {c.areas?.name ?? "—"} · Sold {new Date(c.updated_at).toLocaleDateString()}
                    {c.assigned_telecaller && ` · by ${profiles[c.assigned_telecaller] ?? "—"}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`tel:${c.phone_number}`}><Phone className="h-4 w-4" /> Call</a></Button>
                  <Button asChild size="sm" variant="success"><a href={`https://wa.me/${c.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> WA</a></Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};
