import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { MoreVertical, MessageCircle, Phone, Send, UserCog, CheckCircle2, XCircle, Loader2, Radio } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Renewal = {
  id: string; customer_name: string; phone_number: string; policy_type: string;
  expiry_date: string; assigned_telecaller_id: string | null; status: string;
  premium_amount: number; last_contact_at: string | null;
};

const daysUntil = (d: string) => Math.round((new Date(d + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
const today = () => new Date().toISOString().slice(0,10);

const expiryBadge = (d: string) => {
  const n = daysUntil(d);
  if (n < 0) return <Badge variant="destructive">{Math.abs(n)}d ago</Badge>;
  if (n <= 7) return <Badge className="bg-red-500 hover:bg-red-600 text-white">{n}d</Badge>;
  if (n <= 15) return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{n}d</Badge>;
  if (n <= 30) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{n}d</Badge>;
  return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">{n}d</Badge>;
};

export const RenewalQueue = () => {
  const { role } = useAuth();
  const [rows, setRows] = useState<Renewal[] | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [telecallers, setTelecallers] = useState<{ id: string; full_name: string }[]>([]);
  const [fPolicy, setFPolicy] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fTele, setFTele] = useState("all");
  const [fFrom, setFFrom] = useState(today());
  const [fTo, setFTo] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().slice(0,10); });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkChannel, setBulkChannel] = useState<"whatsapp" | "sms" | "rcs">("whatsapp");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const load = async () => {
    let q = supabase.from("renewals").select("id,customer_name,phone_number,policy_type,expiry_date,assigned_telecaller_id,status,premium_amount,last_contact_at")
      .gte("expiry_date", fFrom).lte("expiry_date", fTo).order("expiry_date", { ascending: true });
    if (fPolicy !== "all") q = q.eq("policy_type", fPolicy);
    if (fStatus !== "all") q = q.eq("status", fStatus);
    if (fTele !== "all") q = q.eq("assigned_telecaller_id", fTele);
    const { data, error } = await q;
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      const [p, tr] = await Promise.all([
        supabase.from("profiles").select("id,full_name"),
        supabase.from("user_roles").select("user_id,role").eq("role", "telecaller"),
      ]);
      setProfiles((p.data ?? []) as any);
      const tids = new Set((tr.data ?? []).map((x: any) => x.user_id));
      setTelecallers((p.data ?? []).filter((x: any) => tids.has(x.id)) as any);
    })();
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 300000); return () => clearInterval(t); }, [fPolicy, fStatus, fTele, fFrom, fTo]);

  const nameOf = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name])), [profiles]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("renewals").update({ status, last_contact_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Marked ${status}` }); load();
  };

  const assign = async (id: string, telecallerId: string) => {
    const { error } = await supabase.from("renewals").update({ assigned_telecaller_id: telecallerId }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Telecaller assigned" }); load();
  };

  const sendMessage = async (r: Renewal, channel: "whatsapp" | "sms") => {
    const { error } = await supabase.functions.invoke("send-renewal-message", {
      body: { renewal_id: r.id, channel },
    });
    if (error) return toast({ title: "Send failed", description: error.message, variant: "destructive" });
    toast({ title: `${channel.toUpperCase()} queued`, description: r.customer_name });
    load();
  };

  if (rows === null) return (
    <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Policy</label>
            <Select value={fPolicy} onValueChange={setFPolicy}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Health">Health</SelectItem><SelectItem value="Life">Life</SelectItem></SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">Status</label>
            <Select value={fStatus} onValueChange={setFStatus}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="renewed">Renewed</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent>
            </Select>
          </div>
          {role !== "telecaller" && (
            <div><label className="text-xs text-muted-foreground">Telecaller</label>
              <Select value={fTele} onValueChange={setFTele}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{telecallers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Renewal Queue ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Koi renewal nahi mila is filter mein.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Mobile</TableHead><TableHead>Policy</TableHead>
                <TableHead>Expiry</TableHead><TableHead>Days</TableHead><TableHead>Telecaller</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>{rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.phone_number}</TableCell>
                  <TableCell><Badge variant="outline">{r.policy_type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.expiry_date}</TableCell>
                  <TableCell>{expiryBadge(r.expiry_date)}</TableCell>
                  <TableCell className="text-xs">{r.assigned_telecaller_id ? (nameOf.get(r.assigned_telecaller_id) ?? "—") : <span className="text-muted-foreground">unassigned</span>}</TableCell>
                  <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button asChild size="icon" variant="ghost" title="Call"><a href={`tel:${r.phone_number}`}><Phone className="h-4 w-4" /></a></Button>
                      <Button size="icon" variant="ghost" title="WhatsApp" onClick={() => sendMessage(r, "whatsapp")}><MessageCircle className="h-4 w-4 text-success" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Channels</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => sendMessage(r, "whatsapp")}><MessageCircle className="h-4 w-4 mr-2" /> Send WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendMessage(r, "sms")}><Send className="h-4 w-4 mr-2" /> Send SMS</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Assign</DropdownMenuLabel>
                          {telecallers.map(t => (
                            <DropdownMenuItem key={t.id} onClick={() => assign(r.id, t.id)}><UserCog className="h-4 w-4 mr-2" /> {t.full_name}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setStatus(r.id, "contacted")}><Loader2 className="h-4 w-4 mr-2" /> Mark Contacted</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus(r.id, "renewed")}><CheckCircle2 className="h-4 w-4 mr-2 text-success" /> Mark Renewed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatus(r.id, "lost")}><XCircle className="h-4 w-4 mr-2 text-destructive" /> Mark Lost</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
