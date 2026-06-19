import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, FileWarning, IndianRupee, AlarmClock,
  MessageCircle, Phone, FileText, Users, Wallet, Building2, User, Package,
} from "lucide-react";
import { CustomerProductsTab } from "./CustomerProductsTab";


type Customer = {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  kyc_status: string;
};

type RowList = { loading: boolean; rows: any[] };
const empty: RowList = { loading: true, rows: [] };

const Empty = ({ label }: { label: string }) => (
  <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>
);

const SectionList = <T extends { id: string }>({
  data, render, emptyLabel,
}: { data: RowList; render: (r: T) => React.ReactNode; emptyLabel: string }) => {
  if (data.loading) return <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>;
  if (!data.rows.length) return <Empty label={emptyLabel} />;
  return <div className="space-y-2">{data.rows.map((r) => render(r as T))}</div>;
};

export const CustomerProfileDialog = ({
  customer, open, onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [tab, setTab] = useState("products");
  const [policies, setPolicies] = useState<RowList>(empty);
  const [claims, setClaims] = useState<RowList>(empty);
  const [premiumDue, setPremiumDue] = useState<RowList>(empty);
  const [renewals, setRenewals] = useState<RowList>(empty);
  const [wa, setWa] = useState<RowList>(empty);
  const [calls, setCalls] = useState<RowList>(empty);
  const [docs, setDocs] = useState<RowList>(empty);
  const [family, setFamily] = useState<RowList>(empty);
  const [rto, setRto] = useState<RowList>(empty);

  useEffect(() => {
    if (!open || !customer) return;
    const cid = customer.id;
    const mobile = customer.mobile;

    (async () => {
      // Policies: aggregate motor + health + life by customer/mobile
      const [motor, health, life] = await Promise.all([
        (supabase as any).from("motor_policies").select("id,policy_no,insurer,premium,end_date,status").or(`customer_id.eq.${cid},mobile.eq.${mobile}`),
        (supabase as any).from("health_policies").select("id,policy_no,insurer,premium,end_date,status").or(`customer_id.eq.${cid},mobile.eq.${mobile}`),
        (supabase as any).from("life_policies").select("id,policy_no,insurer,premium,end_date,status").or(`customer_id.eq.${cid},mobile.eq.${mobile}`),
      ]);
      const all = [
        ...(motor.data ?? []).map((r: any) => ({ ...r, type: "Motor" })),
        ...(health.data ?? []).map((r: any) => ({ ...r, type: "Health" })),
        ...(life.data ?? []).map((r: any) => ({ ...r, type: "Life" })),
      ];
      setPolicies({ loading: false, rows: all });

      const [{ data: cl }, { data: rn }, { data: dc }, { data: fm }, { data: rt }] = await Promise.all([
        (supabase as any).from("claims").select("id,claim_no,status,amount,created_at").or(`customer_id.eq.${cid},mobile.eq.${mobile}`).order("created_at", { ascending: false }),
        (supabase as any).from("renewals").select("id,policy_no,due_date,premium,status").or(`customer_id.eq.${cid},mobile.eq.${mobile}`).order("due_date"),
        (supabase as any).from("customer_documents").select("id,doc_type,label,storage_path,created_at").eq("customer_id", cid).order("created_at", { ascending: false }),
        (supabase as any).from("customers").select("id,full_name,mobile,relation_to_head").or(`family_head_id.eq.${cid},id.eq.${customer.id}`),
        (supabase as any).from("rto_cases").select("id,case_no,service_type,status,created_at").or(`customer_id.eq.${cid},mobile.eq.${mobile}`).order("created_at", { ascending: false }),
      ]);
      setClaims({ loading: false, rows: cl ?? [] });
      setRenewals({ loading: false, rows: rn ?? [] });
      setDocs({ loading: false, rows: dc ?? [] });
      setFamily({ loading: false, rows: fm ?? [] });
      setRto({ loading: false, rows: rt ?? [] });

      // Premium Due = policies with end_date in next 60 days
      const today = new Date(); const horizon = new Date(); horizon.setDate(today.getDate() + 60);
      const due = all.filter((p: any) => p.end_date && new Date(p.end_date) >= today && new Date(p.end_date) <= horizon);
      setPremiumDue({ loading: false, rows: due });

      const [{ data: wlogs }, { data: clogs }] = await Promise.all([
        (supabase as any).from("whatsapp_logs").select("id,to_number,message,status,created_at").eq("to_number", mobile).order("created_at", { ascending: false }).limit(100),
        (supabase as any).from("call_logs").select("id,status,called_at,lead_id").order("called_at", { ascending: false }).limit(100),
      ]);
      setWa({ loading: false, rows: wlogs ?? [] });
      setCalls({ loading: false, rows: clogs ?? [] });
    })();
  }, [open, customer]);

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            {customer.full_name}
            <Badge variant="outline" className="font-mono text-xs">{customer.mobile}</Badge>
            <Badge variant={customer.kyc_status === "verified" ? "default" : "secondary"}>KYC: {customer.kyc_status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="products"><Package className="mr-1 h-4 w-4" /> Products</TabsTrigger>
            <TabsTrigger value="policies"><ShieldCheck className="mr-1 h-4 w-4" /> Policies</TabsTrigger>
            <TabsTrigger value="claims"><FileWarning className="mr-1 h-4 w-4" /> Claims</TabsTrigger>
            <TabsTrigger value="premium_due"><IndianRupee className="mr-1 h-4 w-4" /> Premium Due</TabsTrigger>
            <TabsTrigger value="renewals"><AlarmClock className="mr-1 h-4 w-4" /> Renewals</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="calls"><Phone className="mr-1 h-4 w-4" /> Call History</TabsTrigger>
            <TabsTrigger value="docs"><FileText className="mr-1 h-4 w-4" /> Docs / KYC</TabsTrigger>
            <TabsTrigger value="family"><Users className="mr-1 h-4 w-4" /> Family</TabsTrigger>
            <TabsTrigger value="finance"><Wallet className="mr-1 h-4 w-4" /> Finance / Loan</TabsTrigger>
            <TabsTrigger value="rto"><Building2 className="mr-1 h-4 w-4" /> RTO Services</TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <SectionList data={policies} emptyLabel="No policies linked to this customer."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><Badge variant="outline" className="mr-2">{r.type}</Badge><span className="font-medium">{r.policy_no ?? "—"}</span><span className="ml-2 text-xs text-muted-foreground">{r.insurer ?? ""}</span></div>
                  <div className="text-xs text-muted-foreground">Premium ₹{r.premium ?? 0} · Ends {r.end_date ?? "—"}</div>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="claims">
            <SectionList data={claims} emptyLabel="No claims filed."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><span className="font-medium">{r.claim_no ?? r.id.slice(0, 8)}</span> <Badge variant="secondary" className="ml-2">{r.status}</Badge></div>
                  <div className="text-xs">₹{r.amount ?? 0}</div>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="premium_due">
            <SectionList data={premiumDue} emptyLabel="No premiums due in the next 60 days."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><Badge variant="outline" className="mr-2">{r.type}</Badge><span className="font-medium">{r.policy_no ?? "—"}</span></div>
                  <div className="text-xs text-destructive">Due {r.end_date} · ₹{r.premium ?? 0}</div>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="renewals">
            <SectionList data={renewals} emptyLabel="No renewals scheduled."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><span className="font-medium">{r.policy_no ?? "—"}</span> <Badge variant="secondary" className="ml-2">{r.status}</Badge></div>
                  <div className="text-xs">Due {r.due_date} · ₹{r.premium ?? 0}</div>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="whatsapp">
            <SectionList data={wa} emptyLabel="No WhatsApp messages yet."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="space-y-1 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs">{r.message}</p>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="calls">
            <SectionList data={calls} emptyLabel="No calls logged."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <Badge variant="outline">{r.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(r.called_at).toLocaleString()}</span>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="docs">
            <SectionList data={docs} emptyLabel="No documents uploaded."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium uppercase">{r.doc_type}</span><span className="text-xs text-muted-foreground">{r.label}</span></div>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { data } = await supabase.storage.from("customer-docs").createSignedUrl(r.storage_path, 60);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}>View</Button>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="family">
            <SectionList data={family} emptyLabel="No family members linked."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><span className="font-medium">{r.full_name}</span><span className="ml-2 text-xs text-muted-foreground">{r.relation_to_head ?? (r.id === customer.id ? "self / head" : "member")}</span></div>
                  <span className="font-mono text-xs">{r.mobile}</span>
                </CardContent></Card>
              )}
            />
          </TabsContent>

          <TabsContent value="finance">
            <Empty label="Finance / Loan tracking coming soon. Wire to your loan products table when ready." />
          </TabsContent>

          <TabsContent value="rto">
            <SectionList data={rto} emptyLabel="No RTO cases for this customer."
              render={(r: any) => (
                <Card key={r.id}><CardContent className="flex items-center justify-between p-3 text-sm">
                  <div><span className="font-medium">{r.case_no ?? r.id.slice(0, 8)}</span><span className="ml-2 text-xs text-muted-foreground">{r.service_type}</span></div>
                  <Badge variant="secondary">{r.status}</Badge>
                </CardContent></Card>
              )}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
