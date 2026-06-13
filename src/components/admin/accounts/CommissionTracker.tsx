import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export const CommissionTracker = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("policy_transactions").select("*, insurers(name), agents_profile(full_name)").order("expected_payout_date", { ascending: true }).limit(1000)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const t = today();
  const expected = useMemo(() => rows.filter((r) => r.status === "expected" && (!r.expected_payout_date || r.expected_payout_date >= t)), [rows]);
  const overdue = useMemo(() => rows.filter((r) => r.status === "expected" && r.expected_payout_date && r.expected_payout_date < t), [rows]);
  const received = useMemo(() => rows.filter((r) => r.status === "received"), [rows]);

  const sum = (arr: any[], k: string) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);

  const Tile = ({ icon: Icon, label, value, sub, tone }: any) => (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-full p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );

  const renderTable = (data: any[]) => (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Policy #</TableHead><TableHead>Insurer</TableHead>
            <TableHead>Client</TableHead><TableHead>Agent</TableHead>
            <TableHead className="text-right">Commission</TableHead><TableHead>Expected By</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((r) => {
              const days = r.expected_payout_date ? Math.floor((new Date(r.expected_payout_date).getTime() - Date.now()) / 86400000) : null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.txn_date}</TableCell>
                  <TableCell className="font-mono text-xs">{r.policy_no || "—"}</TableCell>
                  <TableCell className="text-xs">{r.insurers?.name || "—"}</TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell className="text-xs">{r.agents_profile?.full_name || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{inr(r.commission_amount)}</TableCell>
                  <TableCell className="text-xs">
                    {r.expected_payout_date || "—"}
                    {days !== null && days < 0 && <Badge variant="destructive" className="ml-2">{Math.abs(days)}d late</Badge>}
                    {days !== null && days >= 0 && days <= 7 && <Badge variant="outline" className="ml-2">{days}d</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
            {!data.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nothing here.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Tile icon={Clock} label="Expected" value={inr(sum(expected, "commission_amount"))} sub={`${expected.length} txns`} tone="bg-primary/10 text-primary" />
        <Tile icon={AlertTriangle} label="Overdue" value={inr(sum(overdue, "commission_amount"))} sub={`${overdue.length} txns`} tone="bg-destructive/10 text-destructive" />
        <Tile icon={CheckCircle2} label="Received" value={inr(sum(received, "received_amount") || sum(received, "commission_amount"))} sub={`${received.length} txns`} tone="bg-success/10 text-success" />
        <Tile icon={TrendingUp} label="Total Booked" value={inr(sum(rows, "commission_amount"))} sub={`${rows.length} txns total`} tone="bg-accent/10 text-accent-foreground" />
      </div>
      <Tabs defaultValue="expected">
        <TabsList>
          <TabsTrigger value="expected">Expected ({expected.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expected" className="mt-3">{renderTable(expected)}</TabsContent>
        <TabsContent value="overdue" className="mt-3">{renderTable(overdue)}</TabsContent>
        <TabsContent value="received" className="mt-3">{renderTable(received)}</TabsContent>
      </Tabs>
    </div>
  );
};
