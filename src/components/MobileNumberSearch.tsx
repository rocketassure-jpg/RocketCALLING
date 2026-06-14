import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, UserCheck } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export type PhoneLookupHit = {
  source: "lead" | "customer" | "enquiry";
  id: string;
  customer_name: string;
  phone_number: string;
  policy_type?: string | null;
  status?: string | null;
  assigned_telecaller?: string | null;
  premium_amount?: number | null;
  email?: string | null;
  city?: string | null;
};

export const MobileNumberSearch = ({
  onPrefill,
  placeholder = "10-digit mobile dhundo…",
  autoFocus = false,
}: {
  onPrefill?: (hit: PhoneLookupHit) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) => {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 350);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<PhoneLookupHit[] | null>(null);

  useEffect(() => {
    const digits = debounced.replace(/\D/g, "");
    if (digits.length < 10) { setHits(null); return; }
    setLoading(true);
    (async () => {
      const tail = digits.slice(-10);
      const [leads, customers, enquiries] = await Promise.all([
        supabase.from("leads").select("id,customer_name,phone_number,policy_type,status,assigned_telecaller,premium_amount").ilike("phone_number", `%${tail}`).limit(3),
        supabase.from("customers").select("id,full_name,mobile,email,city").ilike("mobile", `%${tail}`).limit(3),
        supabase.from("enquiries").select("id,customer_name,phone_number,insurance_type,handled").ilike("phone_number", `%${tail}`).limit(3),
      ]);
      const out: PhoneLookupHit[] = [];
      (leads.data ?? []).forEach((l: any) => out.push({ source: "lead", id: l.id, customer_name: l.customer_name, phone_number: l.phone_number, policy_type: l.policy_type, status: l.status, assigned_telecaller: l.assigned_telecaller, premium_amount: l.premium_amount }));
      (customers.data ?? []).forEach((c: any) => out.push({ source: "customer", id: c.id, customer_name: c.full_name, phone_number: c.mobile, email: c.email, city: c.city }));
      (enquiries.data ?? []).forEach((e: any) => out.push({ source: "enquiry", id: e.id, customer_name: e.customer_name, phone_number: e.phone_number, policy_type: e.insurance_type, status: e.handled ? "handled" : "open" }));
      setHits(out);
      setLoading(false);
    })();
  }, [debounced]);

  const sourceColor = (s: PhoneLookupHit["source"]) =>
    s === "lead" ? "bg-primary/10 text-primary" : s === "customer" ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground";

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          className="pl-9"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="numeric"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {hits && hits.length === 0 && (
        <Card><CardContent className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Plus className="h-4 w-4" /> Naya record — neeche details fill karo.
        </CardContent></Card>
      )}

      {hits && hits.length > 0 && (
        <div className="space-y-2">
          {hits.map((h) => (
            <Card key={`${h.source}-${h.id}`} className="border-l-4 border-l-primary">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{h.customer_name || "(no name)"}</span>
                    <Badge className={sourceColor(h.source)} variant="outline">{h.source}</Badge>
                    {h.policy_type && <Badge variant="outline">{h.policy_type}</Badge>}
                    {h.status && <Badge variant="secondary">{h.status}</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {h.phone_number} {h.email ? `· ${h.email}` : ""} {h.city ? `· ${h.city}` : ""}
                  </div>
                </div>
                {onPrefill && (
                  <Button size="sm" variant="hero" onClick={() => onPrefill(h)}>
                    <Plus className="h-4 w-4" /> Add to System
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
