import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Megaphone, Plus, Loader2, Trash2, Edit3, MessageCircle, Phone, Radio, Mic,
  Facebook, Instagram, Linkedin, RefreshCw, Send, CalendarClock, Users as UsersIcon, Eye, FileText, BarChart3,
} from "lucide-react";

type Integration = any;
type Template = any;
type Campaign = any;
type AudienceCfg = any;
type ScheduledPost = any;

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-green-500" },
  sms: { label: "SMS", icon: Send, color: "text-blue-500" },
  rcs: { label: "RCS", icon: Radio, color: "text-purple-500" },
  voice: { label: "AI Voice", icon: Mic, color: "text-orange-500" },
  meta: { label: "Meta Ads", icon: Facebook, color: "text-blue-600" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-indigo-500" },
};

export const MarketingAutomationPanel = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Marketing Hub</h1>
          <p className="text-sm text-muted-foreground">Multi-channel outreach — WhatsApp, SMS, RCS, AI Voice & Social.</p>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="campaigns">Renewal Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="social">Social Scheduler</TabsTrigger>
          <TabsTrigger value="audience">Audience Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts"><ConnectedAccountsTab /></TabsContent>
        <TabsContent value="campaigns"><RenewalCampaignsTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="social"><SocialSchedulerTab /></TabsContent>
        <TabsContent value="audience"><AudienceSyncTab /></TabsContent>
      </Tabs>
    </div>
  );
};

/* =================== Connected Accounts =================== */

const ConnectedAccountsTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("marketing_integrations").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onTest = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("marketing-send", { body: { action: "test-connection", integration_id: id } });
    if (error) toast({ title: "Test failed", description: error.message, variant: "destructive" });
    else toast({ title: (data as any)?.success ? "Connection OK" : "Connection failed", description: (data as any)?.message });
    load();
  };

  const onDelete = async (id: string) => {
    const { error } = await (supabase as any).from("marketing_integrations").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Removed" }); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Add WhatsApp, SMS, RCS, voice and social channels.</p>
        <Button variant="hero" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Channel
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No integrations yet. Add your first channel above.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const meta = PLATFORM_META[i.platform] ?? { label: i.platform, icon: Megaphone, color: "" };
            const Icon = meta.icon;
            return (
              <Card key={i.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                      <CardTitle className="text-base">{i.label}</CardTitle>
                    </div>
                    <Badge variant={i.status === "active" ? "default" : i.status === "error" ? "destructive" : "secondary"}>
                      {i.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="text-xs text-muted-foreground">{meta.label}</div>
                  {i.last_error && <div className="text-xs text-destructive">{i.last_error}</div>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onTest(i.id)}><RefreshCw className="h-3 w-3" /> Test</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(i); setOpen(true); }}><Edit3 className="h-3 w-3" /> Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Remove {i.label}?</AlertDialogTitle>
                          <AlertDialogDescription>This integration will be deleted permanently.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(i.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <IntegrationDialog open={open} onOpenChange={setOpen} editing={editing} companyId={companyId} onSaved={load} />
    </div>
  );
};

const IntegrationDialog = ({ open, onOpenChange, editing, companyId, onSaved }: any) => {
  const [form, setForm] = useState<any>({ platform: "whatsapp" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ?? { platform: "whatsapp", label: "" });
  }, [editing, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.label || !form.platform) return toast({ title: "Label and platform required", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, company_id: companyId };
    const { error } = editing
      ? await (supabase as any).from("marketing_integrations").update(payload).eq("id", editing.id)
      : await (supabase as any).from("marketing_integrations").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); onOpenChange(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Channel</DialogTitle>
          <DialogDescription>Connect a messaging or social channel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => set("platform", v)} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Label</Label><Input value={form.label ?? ""} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Primary WA" /></div>

          {form.platform === "whatsapp" && (
            <>
              <div className="grid gap-1.5"><Label>Phone Number ID</Label><Input value={form.wa_phone_number_id ?? ""} onChange={(e) => set("wa_phone_number_id", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>WhatsApp Business Account ID</Label><Input value={form.wa_waba_id ?? ""} onChange={(e) => set("wa_waba_id", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Access Token</Label><Input type="password" value={form.access_token ?? ""} onChange={(e) => set("access_token", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Webhook Secret</Label><Input value={form.wa_webhook_secret ?? ""} onChange={(e) => set("wa_webhook_secret", e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">Get these from Meta Business Manager → WhatsApp → API Setup.</p>
            </>
          )}

          {form.platform === "sms" && (
            <>
              <div className="grid gap-1.5"><Label>Provider</Label>
                <Select value={form.sms_provider ?? "msg91"} onValueChange={(v) => set("sms_provider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="msg91">Msg91</SelectItem>
                    <SelectItem value="textlocal">TextLocal</SelectItem>
                    <SelectItem value="valuefirst">ValueFirst</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label>API Key</Label><Input type="password" value={form.sms_api_key ?? ""} onChange={(e) => set("sms_api_key", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Sender ID (DLT registered)</Label><Input value={form.sms_sender_id ?? ""} onChange={(e) => set("sms_sender_id", e.target.value)} maxLength={6} /></div>
              <p className="text-xs text-muted-foreground">DLT registered sender ID required for India.</p>
            </>
          )}

          {form.platform === "rcs" && (
            <>
              <div className="grid gap-1.5"><Label>API Key</Label><Input type="password" value={form.sms_api_key ?? ""} onChange={(e) => set("sms_api_key", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Sender ID</Label><Input value={form.sms_sender_id ?? ""} onChange={(e) => set("sms_sender_id", e.target.value)} /></div>
              <div className="flex items-center justify-between"><Label>Enable RCS</Label><Switch checked={!!form.rcs_enabled} onCheckedChange={(v) => set("rcs_enabled", v)} /></div>
            </>
          )}

          {form.platform === "voice" && (
            <>
              <div className="grid gap-1.5"><Label>Provider</Label>
                <Select value={form.voice_provider ?? "exotel"} onValueChange={(v) => set("voice_provider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exotel">Exotel</SelectItem>
                    <SelectItem value="knowlarity">Knowlarity</SelectItem>
                    <SelectItem value="servetel">Servetel</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label>API Key</Label><Input type="password" value={form.voice_api_key ?? ""} onChange={(e) => set("voice_api_key", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>API Token / Secret</Label><Input type="password" value={form.access_token ?? ""} onChange={(e) => set("access_token", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Account SID</Label><Input value={form.wa_waba_id ?? ""} onChange={(e) => set("wa_waba_id", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Caller ID (verified)</Label><Input value={form.voice_caller_id ?? ""} onChange={(e) => set("voice_caller_id", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>TTS Engine</Label>
                <Select value={form.voice_tts_engine ?? "google"} onValueChange={(v) => set("voice_tts_engine", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="google">Google</SelectItem><SelectItem value="elevenlabs">ElevenLabs</SelectItem><SelectItem value="azure">Azure</SelectItem></SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Exotel recommended for India. Register caller ID first.</p>
            </>
          )}

          {(form.platform === "meta" || form.platform === "instagram" || form.platform === "linkedin") && (
            <>
              {form.platform === "meta" && <div className="grid gap-1.5"><Label>Ad Account ID</Label><Input value={form.ad_account_id ?? ""} onChange={(e) => set("ad_account_id", e.target.value)} /></div>}
              <div className="grid gap-1.5"><Label>Page ID / Account ID</Label><Input value={form.page_id ?? ""} onChange={(e) => set("page_id", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Access Token (System User recommended)</Label><Input type="password" value={form.access_token ?? ""} onChange={(e) => set("access_token", e.target.value)} /></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =================== Renewal Campaigns =================== */

const RenewalCampaignsTab = () => {
  return (
    <Tabs defaultValue="builder" className="space-y-4">
      <TabsList>
        <TabsTrigger value="builder">Campaign Builder</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="builder"><CampaignBuilder /></TabsContent>
      <TabsContent value="history"><CampaignHistory /></TabsContent>
      <TabsContent value="analytics"><CampaignAnalytics /></TabsContent>
    </Tabs>
  );
};

const CampaignBuilder = () => {
  const { companyId } = useAuth();
  const [form, setForm] = useState<any>({
    name: "", channel: "whatsapp", template_id: "", filter_expiry_from: "",
    filter_expiry_to: "", filter_policy_type: "All", filter_city: "", filter_telecaller_id: "",
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("marketing_templates").select("*").eq("is_active", true);
      setTemplates(data ?? []);
    })();
  }, []);

  const filteredTemplates = templates.filter((t) => t.channel === form.channel);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const previewAudience = async () => {
    let q = (supabase as any).from("leads").select("id", { count: "exact", head: true }).not("phone_number", "is", null);
    if (form.filter_expiry_from) q = q.gte("policy_expiry_date", form.filter_expiry_from);
    if (form.filter_expiry_to) q = q.lte("policy_expiry_date", form.filter_expiry_to);
    if (form.filter_policy_type && form.filter_policy_type !== "All") q = q.eq("policy_type", form.filter_policy_type);
    if (form.filter_city) q = q.eq("city_village", form.filter_city);
    if (form.filter_telecaller_id) q = q.eq("assigned_telecaller", form.filter_telecaller_id);
    const { count } = await q;
    setCount(count ?? 0);
  };

  const runCampaign = async () => {
    if (!form.name) return toast({ title: "Campaign name required", variant: "destructive" });
    setRunning(true);
    const payload = { ...form, company_id: companyId, status: "draft" };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
    const { data: c, error } = await (supabase as any).from("renewal_campaigns").insert(payload).select("id").single();
    if (error) { setRunning(false); return toast({ title: "Create failed", description: error.message, variant: "destructive" }); }
    const { error: runErr } = await supabase.functions.invoke("marketing-send", { body: { action: "run-campaign", campaign_id: c.id } });
    setRunning(false);
    if (runErr) return toast({ title: "Run failed", description: runErr.message, variant: "destructive" });
    toast({ title: "Campaign launched", description: "Targets queued — check History tab." });
    setForm({ name: "", channel: "whatsapp", template_id: "", filter_expiry_from: "", filter_expiry_to: "", filter_policy_type: "All", filter_city: "", filter_telecaller_id: "" });
    setCount(null);
  };

  return (
    <Card>
      <CardHeader><CardTitle>New Campaign</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5"><Label>Campaign Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Channel</Label>
          <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="rcs">RCS</SelectItem>
              <SelectItem value="voice">AI Voice</SelectItem>
              <SelectItem value="assign">Assign to Telecaller</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.channel !== "assign" && (
          <div className="grid gap-1.5 md:col-span-2"><Label>Template</Label>
            <Select value={form.template_id} onValueChange={(v) => set("template_id", v)}>
              <SelectTrigger><SelectValue placeholder={filteredTemplates.length ? "Select template" : "No templates for this channel"} /></SelectTrigger>
              <SelectContent>{filteredTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-1.5"><Label>Expiry From</Label><Input type="date" value={form.filter_expiry_from} onChange={(e) => set("filter_expiry_from", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Expiry To</Label><Input type="date" value={form.filter_expiry_to} onChange={(e) => set("filter_expiry_to", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Policy Type</Label>
          <Select value={form.filter_policy_type} onValueChange={(v) => set("filter_policy_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Motor">Motor</SelectItem>
              <SelectItem value="Health">Health</SelectItem>
              <SelectItem value="Life">Life</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5"><Label>City (optional)</Label><Input value={form.filter_city} onChange={(e) => set("filter_city", e.target.value)} /></div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-2">
          <Button variant="outline" onClick={previewAudience}><Eye className="h-4 w-4" /> Preview Audience</Button>
          {count !== null && <Badge variant="secondary">{count} leads will be targeted</Badge>}
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="hero" disabled={running || !form.name}>{running && <Loader2 className="h-4 w-4 animate-spin" />} Run Campaign</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Send to {count ?? "?"} customers via {form.channel}?</AlertDialogTitle>
                <AlertDialogDescription>This action will queue messages immediately. Continue?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={runCampaign}>Yes, run</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

const CampaignHistory = () => {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("renewal_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return (
    <Card>
      <CardHeader><CardTitle>Recent Campaigns</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
          : rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No campaigns yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Channel</TableHead><TableHead>Targets</TableHead>
              <TableHead>Sent</TableHead><TableHead>Replied</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
            </TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                <TableCell>{r.total_targets ?? 0}</TableCell>
                <TableCell>{r.sent_count ?? 0}</TableCell>
                <TableCell>{r.replied_count ?? 0}</TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const CampaignAnalytics = () => {
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, replied: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("renewal_campaigns").select("total_targets,sent_count,delivered_count,replied_count");
      const sum = (data ?? []).reduce((a: any, c: any) => ({
        total: a.total + (c.total_targets ?? 0),
        sent: a.sent + (c.sent_count ?? 0),
        delivered: a.delivered + (c.delivered_count ?? 0),
        replied: a.replied + (c.replied_count ?? 0),
      }), { total: 0, sent: 0, delivered: 0, replied: 0 });
      setStats(sum);
    })();
  }, []);
  const card = (label: string, value: number) => (
    <Card><CardContent className="py-5"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></CardContent></Card>
  );
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {card("Total Targets", stats.total)}
      {card("Sent", stats.sent)}
      {card("Delivered", stats.delivered)}
      {card("Replied", stats.replied)}
    </div>
  );
};

/* =================== Templates =================== */

const TemplatesTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("marketing_templates").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const shown = filter === "all" ? items : items.filter((i) => i.channel === filter);
  const onDelete = async (id: string) => {
    await (supabase as any).from("marketing_templates").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="rcs">RCS</SelectItem>
            <SelectItem value="voice">Voice</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="hero" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New Template</Button>
      </div>

      {shown.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No templates. Create one to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant="outline">{t.channel}</Badge>
                    {t.category && <Badge variant="secondary">{t.category}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="line-clamp-2 text-sm text-muted-foreground">{t.body_text}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(t); setOpen(true); }}><Edit3 className="h-3 w-3" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog open={open} onOpenChange={setOpen} editing={editing} companyId={companyId} onSaved={load} />
    </div>
  );
};

const VARIABLES = ["customer_name", "policy_type", "expiry_date", "premium_amount", "agent_name", "company_name"];

const TemplateDialog = ({ open, onOpenChange, editing, companyId, onSaved }: any) => {
  const [form, setForm] = useState<any>({ channel: "whatsapp", category: "renewal", body_text: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(editing ?? { channel: "whatsapp", category: "renewal", body_text: "", wa_template_language: "en", voice_language: "hi-IN" }); }, [editing, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const insertVar = (v: string) => set("body_text", `${form.body_text ?? ""}{${v}}`);

  const save = async () => {
    if (!form.name || !form.body_text) return toast({ title: "Name and body required", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, company_id: companyId };
    const { error } = editing
      ? await (supabase as any).from("marketing_templates").update(payload).eq("id", editing.id)
      : await (supabase as any).from("marketing_templates").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" }); onOpenChange(false); onSaved();
  };

  const charCount = (form.body_text ?? "").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Template</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5"><Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem><SelectItem value="voice">Voice</SelectItem><SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Category</Label>
              <Select value={form.category ?? "renewal"} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="renewal">Renewal</SelectItem><SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="followup">Followup</SelectItem><SelectItem value="campaign">Campaign</SelectItem><SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Body Text</Label>
            <div className="flex flex-wrap gap-1">
              {VARIABLES.map((v) => <Button key={v} type="button" size="sm" variant="outline" onClick={() => insertVar(v)}>{`{${v}}`}</Button>)}
            </div>
            <Textarea rows={5} value={form.body_text ?? ""} onChange={(e) => set("body_text", e.target.value)} />
            <p className="text-xs text-muted-foreground">{charCount} chars{form.channel === "sms" ? ` · ${Math.ceil(charCount / 160) || 1} SMS` : ""}</p>
          </div>

          {form.channel === "whatsapp" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5"><Label>Meta Template Name</Label><Input value={form.wa_template_name ?? ""} onChange={(e) => set("wa_template_name", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Language</Label><Input value={form.wa_template_language ?? "en"} onChange={(e) => set("wa_template_language", e.target.value)} /></div>
            </div>
          )}

          {form.channel === "voice" && (
            <>
              <div className="grid gap-1.5"><Label>Voice Script (for TTS)</Label><Textarea rows={4} value={form.voice_script ?? ""} onChange={(e) => set("voice_script", e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Voice Language</Label>
                <Select value={form.voice_language ?? "hi-IN"} onValueChange={(v) => set("voice_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="hi-IN">Hindi</SelectItem><SelectItem value="en-IN">English (IN)</SelectItem><SelectItem value="hi-en">Hinglish</SelectItem></SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =================== Social Scheduler =================== */

const SocialSchedulerTab = () => {
  const { companyId } = useAuth();
  const [form, setForm] = useState<any>({ title: "", content: "", media_url: "", category: "General", platforms: [] as string[], scheduled_at: "" });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const load = async () => {
    const [p, i] = await Promise.all([
      (supabase as any).from("scheduled_posts").select("*").order("scheduled_at", { ascending: false }).limit(50),
      (supabase as any).from("marketing_integrations").select("platform,status").in("platform", ["meta", "instagram", "linkedin"]),
    ]);
    setPosts(p.data ?? []); setIntegrations(i.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const activeSocialPlatforms = useMemo(() => integrations.filter((i: any) => i.status === "active").map((i: any) => i.platform), [integrations]);

  const togglePlatform = (p: string) => {
    setForm((f: any) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x: string) => x !== p) : [...f.platforms, p] }));
  };

  const schedule = async () => {
    if (!form.title || !form.content || !form.scheduled_at || form.platforms.length === 0)
      return toast({ title: "Fill all fields & pick at least 1 platform", variant: "destructive" });
    const payload = { ...form, company_id: companyId, scheduled_at: new Date(form.scheduled_at).toISOString() };
    const { error } = await (supabase as any).from("scheduled_posts").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Post scheduled" });
    setForm({ title: "", content: "", media_url: "", category: "General", platforms: [], scheduled_at: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Compose Post</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Content</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5"><Label>Media URL (optional)</Label><Input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem><SelectItem value="Motor">Motor</SelectItem>
                  <SelectItem value="Health">Health</SelectItem><SelectItem value="Life">Life</SelectItem><SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Platforms</Label>
            {activeSocialPlatforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active social integration. Add one under Connected Accounts.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {activeSocialPlatforms.map((p: string) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                    {PLATFORM_META[p]?.label ?? p}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-1.5"><Label>Schedule At</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          <Button variant="hero" onClick={schedule}><CalendarClock className="h-4 w-4" /> Schedule Post</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scheduled Posts</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {posts.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No scheduled posts.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Platforms</TableHead><TableHead>When</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>{posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="space-x-1">{(p.platforms ?? []).map((pl: string) => <Badge key={pl} variant="outline">{pl}</Badge>)}</TableCell>
                  <TableCell className="text-xs">{new Date(p.scheduled_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={p.status === "posted" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* =================== Audience Sync =================== */

const AudienceSyncTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<AudienceCfg[]>([]);
  const [metaInts, setMetaInts] = useState<Integration[]>([]);
  const [form, setForm] = useState<any>({ audience_name: "", integration_id: "", category: "All", days_before_expiry: 30, days_after_expiry: 0, enabled: true, meta_audience_id: "" });
  const load = async () => {
    const [a, m] = await Promise.all([
      (supabase as any).from("audience_sync_configs").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("marketing_integrations").select("*").eq("platform", "meta"),
    ]);
    setItems(a.data ?? []); setMetaInts(m.data ?? []);
  };
  useEffect(() => { load(); }, []);

  if (metaInts.length === 0) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No Meta integration found. Add one in Connected Accounts to enable audience sync.</CardContent></Card>;
  }

  const create = async () => {
    if (!form.audience_name || !form.integration_id) return toast({ title: "Fill audience name & integration", variant: "destructive" });
    const { error } = await (supabase as any).from("audience_sync_configs").insert({ ...form, company_id: companyId });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule created" });
    setForm({ audience_name: "", integration_id: "", category: "All", days_before_expiry: 30, days_after_expiry: 0, enabled: true, meta_audience_id: "" });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await (supabase as any).from("audience_sync_configs").update({ enabled }).eq("id", id);
    load();
  };
  const syncNow = async () => {
    const { error } = await supabase.functions.invoke("sync-renewal-audiences", { body: {} });
    if (error) return toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    toast({ title: "Sync triggered" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Audience Sync Rule</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5"><Label>Audience Name</Label><Input value={form.audience_name} onChange={(e) => setForm({ ...form, audience_name: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Meta Integration</Label>
            <Select value={form.integration_id} onValueChange={(v) => setForm({ ...form, integration_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{metaInts.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Meta Custom Audience ID</Label><Input value={form.meta_audience_id} onChange={(e) => setForm({ ...form, meta_audience_id: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Policy Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="All">All</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Health">Health</SelectItem><SelectItem value="Life">Life</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Days Before Expiry</Label><Input type="number" value={form.days_before_expiry} onChange={(e) => setForm({ ...form, days_before_expiry: Number(e.target.value) })} /></div>
          <div className="grid gap-1.5"><Label>Days After Expiry</Label><Input type="number" value={form.days_after_expiry} onChange={(e) => setForm({ ...form, days_after_expiry: Number(e.target.value) })} /></div>
          <div className="md:col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /> <Label>Enable on save</Label></div>
            <Button variant="hero" onClick={create}><Plus className="h-4 w-4" /> Create Rule</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sync Rules</CardTitle>
          <Button variant="outline" size="sm" onClick={syncNow}><RefreshCw className="h-4 w-4" /> Sync Now</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No rules yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Audience</TableHead><TableHead>Category</TableHead><TableHead>Window</TableHead><TableHead>Enabled</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.audience_name}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-xs">-{r.days_after_expiry}d → +{r.days_before_expiry}d</TableCell>
                  <TableCell><Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} /></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingAutomationPanel;
