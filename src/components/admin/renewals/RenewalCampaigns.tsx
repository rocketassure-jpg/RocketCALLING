import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Rocket, Loader2 } from "lucide-react";

const today = () => new Date().toISOString().slice(0,10);

export const RenewalCampaigns = () => {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const [form, setForm] = useState({
    name: "Renewal Campaign " + new Date().toLocaleDateString(),
    channel: "whatsapp", template_id: "",
    expiry_from: today(),
    expiry_to: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0,10); })(),
    policy_type: "all", city: "",
  });
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const load = async () => {
    const [c, t] = await Promise.all([
      supabase.from("renewal_campaigns").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("renewal_templates").select("id,name,channel").eq("is_active", true),
    ]);
    setCampaigns(c.data ?? []); setTemplates(t.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filteredTemplates = templates.filter(t => t.channel === form.channel);

  const preview = async () => {
    let q = supabase.from("renewals").select("id", { count: "exact", head: true })
      .gte("expiry_date", form.expiry_from).lte("expiry_date", form.expiry_to).eq("status", "pending");
    if (form.policy_type !== "all") q = q.eq("policy_type", form.policy_type);
    const { count } = await q;
    setPreviewCount(count ?? 0);
  };

  const runCampaign = async () => {
    if (!companyId) return;
    if (form.channel !== "telecaller" && !form.template_id) return toast({ title: "Template select karo", variant: "destructive" });
    setRunning(true);
    const { error } = await supabase.functions.invoke("run-renewal-campaign", {
      body: { ...form, company_id: companyId },
    });
    setRunning(false);
    if (error) return toast({ title: "Campaign failed", description: error.message, variant: "destructive" });
    toast({ title: "Campaign launched 🚀" });
    setOpen(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bulk Campaigns</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Megaphone className="h-4 w-4" /> Run Campaign</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Renewal Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Expiry From</Label><Input type="date" value={form.expiry_from} onChange={(e) => { setForm({ ...form, expiry_from: e.target.value }); setPreviewCount(null); }} /></div>
                <div><Label>Expiry To</Label><Input type="date" value={form.expiry_to} onChange={(e) => { setForm({ ...form, expiry_to: e.target.value }); setPreviewCount(null); }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Policy Type</Label>
                  <Select value={form.policy_type} onValueChange={(v) => { setForm({ ...form, policy_type: v }); setPreviewCount(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Health">Health</SelectItem><SelectItem value="Life">Life</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v, template_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="rcs">RCS</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="telecaller">Assign to Telecaller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.channel !== "telecaller" && (
                <div><Label>Template</Label>
                  <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>{filteredTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm">
                <div>Estimated recipients</div>
                <div className="flex items-center gap-2">
                  {previewCount !== null && <Badge>{previewCount} customers</Badge>}
                  <Button size="sm" variant="outline" onClick={preview}>Preview</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="hero" disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Send</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send to {previewCount ?? "?"} customers?</AlertDialogTitle>
                    <AlertDialogDescription>Ye action reverse nahi hoga. Sare logs Analytics tab me dikhenge.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={runCampaign}>Confirm Send</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Abhi koi campaign nahi.</div>}
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()} · <Badge variant="outline">{c.channel}</Badge></div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge>{c.sent_count} sent</Badge>
                <Badge variant="secondary">{c.response_count} responded</Badge>
                <Badge variant={c.status === "completed" ? "default" : "outline"}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
