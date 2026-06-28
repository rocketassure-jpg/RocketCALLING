import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, IndianRupee, Phone, MessageCircle, Search } from "lucide-react";

type Customer = {
  id: string;
  full_name: string;
  mobile: string;
  city: string | null;
  lifecycle_stage: string | null;
  value_score: number | null;
  customer_since: string;
  created_at: string;
};

const POLICY_HOLDER_STAGES = ["policy_holder", "multi_product", "loyal", "renewal", "claim"];

export const CustomersPanel = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [thisMonth, setThisMonth] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,full_name,mobile,city,lifecycle_stage,value_score,customer_since,created_at")
        .in("lifecycle_stage", POLICY_HOLDER_STAGES)
        .order("customer_since", { ascending: false })
        .limit(500);
      const list = (data ?? []) as any[];
      setCustomers(list);
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      setThisMonth(list.filter((c) => new Date(c.customer_since ?? c.created_at) >= start).length);
    })();
  }, []);

  const filtered = useMemo(() => customers.filter((c) =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile ?? "").includes(search)
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
            <CardTitle>Customers (Policy Holders)</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Name or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Koi customer nahi mila.</p> :
            filtered.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 border-l-success bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.full_name}</span>
                    <Badge variant="outline">{c.lifecycle_stage ?? "—"}</Badge>
                    {c.value_score != null && (
                      <Badge className="bg-success text-success-foreground">
                        <IndianRupee className="h-3 w-3" />{Number(c.value_score).toLocaleString("en-IN")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.mobile} · {c.city ?? "—"} · Since {new Date(c.customer_since ?? c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`tel:${c.mobile}`}><Phone className="h-4 w-4" /> Call</a></Button>
                  <Button asChild size="sm" variant="success">
                    <a href={`https://wa.me/${(c.mobile ?? "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> WA
                    </a>
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
};
