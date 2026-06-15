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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Rocket, Calendar as CalendarIcon, Sparkles, Image as ImageIcon, Users, Route, MessageCircle,
  Link2, BarChart3, Loader2, Wand2, Send, RefreshCw, Plus,
} from "lucide-react";
import { ExternalApiRegistry } from "@/components/admin/ExternalApiRegistry";

const PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "threads", label: "Threads" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "gmb", label: "Google My Business" },
  { key: "twitter", label: "X / Twitter" },
];

export const RocketMarketingEngine = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent border border-primary/30">
        <Rocket className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Rocket Marketing Automation Engine</h2>
          <p className="text-sm text-muted-foreground">
            Content calendar, AI-generated posts & images, smart audiences, lead routing, WhatsApp triggers, paid-ads control — all in one place.
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          <TabsTrigger value="ai-content"><Sparkles className="h-4 w-4 mr-1" />AI Content</TabsTrigger>
          <TabsTrigger value="ai-image"><ImageIcon className="h-4 w-4 mr-1" />AI Poster</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="audiences"><Users className="h-4 w-4 mr-1" />Audiences</TabsTrigger>
          <TabsTrigger value="campaigns">Paid Ads</TabsTrigger>
          <TabsTrigger value="triggers"><MessageCircle className="h-4 w-4 mr-1" />WA Triggers</TabsTrigger>
          <TabsTrigger value="routing"><Route className="h-4 w-4 mr-1" />Lead Routing</TabsTrigger>
          <TabsTrigger value="channels"><Link2 className="h-4 w-4 mr-1" />Channels</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="ai-content"><AIContentTab /></TabsContent>
        <TabsContent value="ai-image"><AIImageTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="audiences"><AudiencesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="triggers"><TriggersTab /></TabsContent>
        <TabsContent value="routing"><RoutingTab /></TabsContent>
        <TabsContent value="channels"><ChannelsTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ============ CALENDAR ============ */
const CalendarTab = () => {
  const { companyId } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const start = new Date(month); start.setDate(1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const { data } = await supabase.from("mkt_scheduled_posts" as any)
      .select("*").eq("company_id", companyId)
      .gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString())
      .order("scheduled_at");
    setPosts((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId, month]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const postsByDay = useMemo(() => {
    const m: Record<number, any[]> = {};
    posts.forEach((p) => {
      const day = new Date(p.scheduled_at).getDate();
      (m[day] = m[day] || []).push(p);
    });
    return m;
  }, [posts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {month.toLocaleString("en", { month: "long", year: "numeric" })} — Content Calendar
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</Button>
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</Button>
          <NewPostDialog onSaved={load} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="animate-spin" /> : (
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="font-semibold p-2 text-center text-muted-foreground">{d}</div>
            ))}
            {cells.map((d, i) => (
              <div key={i} className={`min-h-[90px] p-1 border rounded ${d ? "bg-card" : "bg-transparent border-transparent"}`}>
                {d && (
                  <>
                    <div className="text-[10px] text-muted-foreground mb-1">{d}</div>
                    {(postsByDay[d] || []).slice(0, 3).map((p) => (
                      <div key={p.id} className="bg-primary/20 text-primary rounded px-1 py-0.5 mb-0.5 truncate" title={p.content}>
                        {new Date(p.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {p.channels?.[0] || ""}
                      </div>
                    ))}
                    {(postsByDay[d] || []).length > 3 && <div className="text-[10px] text-muted-foreground">+{(postsByDay[d] || []).length - 3}</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const NewPostDialog = ({ onSaved }: { onSaved: () => void }) => {
  const { companyId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [when, setWhen] = useState<string>(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [channels, setChannels] = useState<string[]>(["facebook"]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!companyId || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("mkt_scheduled_posts" as any).insert({
      company_id: companyId, content, channels, scheduled_at: new Date(when).toISOString(),
      status: "scheduled", created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Scheduled" }); setOpen(false); setContent(""); onSaved();
  };

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New Post</Button>;
  return (
    <Card className="absolute right-6 top-20 z-30 w-[420px] shadow-xl">
      <CardHeader><CardTitle className="text-base">Schedule Post</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Post content..." />
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Badge key={p.key} variant={channels.includes(p.key) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setChannels((c) => c.includes(p.key) ? c.filter((x) => x !== p.key) : [...c, p.key])}>
              {p.label}
            </Badge>
          ))}
        </div>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Schedule</Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ============ AI CONTENT ============ */
const AIContentTab = () => {
  const { companyId, user } = useAuth();
  const [topic, setTopic] = useState("Diwali offer, motor insurance, 20% discount");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<"hinglish" | "english" | "hindi">("hinglish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    setLoading(true); setResult(null);
    const { data, error } = await supabase.functions.invoke("mkt-ai-content", {
      body: { topic, phone, language, channels: ["facebook","instagram","whatsapp"] },
    });
    setLoading(false);
    if (error) { toast({ title: "AI failed", description: error.message, variant: "destructive" }); return; }
    setResult(data);
  };

  const scheduleAll = async () => {
    if (!result?.variants || !companyId) return;
    const base = Date.now() + 3600_000;
    const rows = result.variants.map((v: any, i: number) => ({
      company_id: companyId,
      content: `${v.title ? v.title + "\n\n" : ""}${v.body}${result.hashtags ? "\n\n" + result.hashtags.join(" ") : ""}`,
      channels: ["facebook", "instagram", "whatsapp"],
      scheduled_at: new Date(base + i * 86400_000).toISOString(),
      status: "scheduled", created_by: user?.id,
    }));
    const { error } = await supabase.from("mkt_scheduled_posts" as any).insert(rows);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${rows.length} posts scheduled` });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />AI Content Generator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Topic / Brief</Label><Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phone in CTA</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" /></div>
            <div><Label>Language</Label>
              <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate 5 variants
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Results</CardTitle>
          {result?.variants && <Button size="sm" onClick={scheduleAll}><Send className="h-4 w-4 mr-1" />Schedule all</Button>}
        </CardHeader>
        <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
          {!result && <p className="text-sm text-muted-foreground">Generated copy will appear here.</p>}
          {result?.best_time && <Badge variant="outline">Best time: {result.best_time}</Badge>}
          {result?.variants?.map((v: any, i: number) => (
            <div key={i} className="p-3 border rounded bg-muted/30">
              <div className="font-semibold text-sm mb-1">{v.title}</div>
              <div className="text-xs whitespace-pre-wrap">{v.body}</div>
            </div>
          ))}
          {result?.hashtags && (
            <div className="text-xs text-primary">{result.hashtags.join(" ")}</div>
          )}
          {result?.image_prompt && (
            <div className="text-xs text-muted-foreground">Suggested image: {result.image_prompt}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ============ AI IMAGE ============ */
const AIImageTab = () => {
  const [prompt, setPrompt] = useState("Diwali motor insurance 20% off, diyas and a car");
  const [phone, setPhone] = useState("");
  const [offer, setOffer] = useState("20% OFF");
  const [loading, setLoading] = useState(false);
  const [img, setImg] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setImg(null);
    const { data, error } = await supabase.functions.invoke("mkt-ai-image", { body: { prompt, phone, offer } });
    setLoading(false);
    if (error) { toast({ title: "Image failed", description: error.message, variant: "destructive" }); return; }
    setImg((data as any)?.image_url || null);
    if (!(data as any)?.image_url) toast({ title: "No image returned", variant: "destructive" });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" />AI Poster Generator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Concept</Label><Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Offer text</Label><Input value={offer} onChange={(e) => setOffer(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}Generate poster
          </Button>
          <p className="text-xs text-muted-foreground">Branded square image with Rocketdial red/orange palette.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
        <CardContent>
          {img ? <img src={img} alt="poster" className="rounded-lg w-full" /> :
            <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-sm">No image yet</div>}
        </CardContent>
      </Card>
    </div>
  );
};

/* ============ TEMPLATES ============ */
const TemplatesTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = supabase.from("mkt_templates" as any).select("*").order("category");
      const { data } = await q;
      setItems((data as any) || []); setLoading(false);
    })();
  }, []);
  const cats = useMemo(() => ["all", ...Array.from(new Set(items.map((i) => i.category)))], [items]);
  const filtered = category === "all" ? items : items.filter((i) => i.category === category);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Templates Library ({items.length})</CardTitle>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="animate-spin" /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <div key={t.id} className="p-3 border rounded bg-card hover:border-primary/50 transition">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  {t.is_system && <Badge variant="secondary" className="text-xs">system</Badge>}
                </div>
                <div className="font-semibold text-sm mb-1">{t.title}</div>
                <div className="text-xs whitespace-pre-wrap text-muted-foreground line-clamp-6">{t.body}</div>
                {t.hashtags && <div className="text-[10px] text-primary mt-2">{t.hashtags}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ============ AUDIENCES ============ */
const AudiencesTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("mkt_audiences" as any).select("*").eq("company_id", companyId).order("name");
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const syncCount = async (aud: any) => {
    if (!companyId) return;
    let count = 0;
    const rules = aud.rules || {};
    try {
      if (aud.source === "renewals" && rules.expiry_within_days) {
        const after = rules.expiry_after_days || 0;
        const end = new Date(); end.setDate(end.getDate() + rules.expiry_within_days);
        const start = new Date(); start.setDate(start.getDate() + after);
        const { count: c } = await supabase.from("renewals").select("*", { count: "exact", head: true })
          .eq("company_id", companyId).gte("expiry_date", start.toISOString().slice(0,10)).lte("expiry_date", end.toISOString().slice(0,10));
        count = c || 0;
      } else if (aud.source === "renewals" && rules.lapsed_days) {
        const ago = new Date(); ago.setDate(ago.getDate() - rules.lapsed_days);
        const { count: c } = await supabase.from("renewals").select("*", { count: "exact", head: true })
          .eq("company_id", companyId).lt("expiry_date", ago.toISOString().slice(0,10));
        count = c || 0;
      } else if (aud.source === "customers" && rules.customer_added_days) {
        const ago = new Date(); ago.setDate(ago.getDate() - rules.customer_added_days);
        const { count: c } = await supabase.from("customers").select("*", { count: "exact", head: true })
          .eq("company_id", companyId).gte("created_at", ago.toISOString());
        count = c || 0;
      } else {
        const { count: c } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("company_id", companyId);
        count = c || 0;
      }
    } catch {}
    await supabase.from("mkt_audiences" as any).update({ member_count: count, last_synced_at: new Date().toISOString() }).eq("id", aud.id);
    toast({ title: `${aud.name}: ${count} members` });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Smart Audiences</CardTitle>
        <Button size="sm" variant="outline" onClick={() => items.forEach(syncCount)}>
          <RefreshCw className="h-4 w-4 mr-1" />Sync all
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Source</TableHead><TableHead>Rules</TableHead>
              <TableHead className="text-right">Members</TableHead><TableHead>Last Sync</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}<div className="text-xs text-muted-foreground">{a.description}</div></TableCell>
                  <TableCell><Badge variant="outline">{a.source}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{JSON.stringify(a.rules)}</TableCell>
                  <TableCell className="text-right font-bold">{a.member_count}</TableCell>
                  <TableCell className="text-xs">{a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => syncCount(a)}><RefreshCw className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

/* ============ CAMPAIGNS (Paid Ads shell) ============ */
const CampaignsTab = () => {
  const { companyId, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", campaign_type: "renewal", budget_daily: 1000, budget_monthly: 30000, cpl_limit: 250 });

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("mkt_campaigns" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const create = async () => {
    if (!companyId || !form.name) return;
    const { error } = await supabase.from("mkt_campaigns" as any).insert({ ...form, company_id: companyId, created_by: user?.id, status: "draft" });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campaign created" }); setForm({ ...form, name: "" }); load();
  };

  const toggle = async (c: any) => {
    const next = c.status === "active" ? "paused" : "active";
    await supabase.from("mkt_campaigns" as any).update({ status: next }).eq("id", c.id); load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New Campaign</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-2">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="renewal">Renewal</SelectItem>
              <SelectItem value="new_customer">New Customer</SelectItem>
              <SelectItem value="cross_sell">Cross-Sell</SelectItem>
              <SelectItem value="rto">RTO Services</SelectItem>
              <SelectItem value="festival">Festival</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Daily ₹" value={form.budget_daily} onChange={(e) => setForm({ ...form, budget_daily: +e.target.value })} />
          <Input type="number" placeholder="Monthly ₹" value={form.budget_monthly} onChange={(e) => setForm({ ...form, budget_monthly: +e.target.value })} />
          <Input type="number" placeholder="CPL limit ₹" value={form.cpl_limit} onChange={(e) => setForm({ ...form, cpl_limit: +e.target.value })} />
          <Button onClick={create} className="md:col-span-5"><Plus className="h-4 w-4 mr-1" />Create</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="animate-spin" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Daily</TableHead>
                <TableHead>Monthly</TableHead><TableHead>CPL Limit</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.campaign_type}</Badge></TableCell>
                    <TableCell>₹{c.budget_daily}</TableCell>
                    <TableCell>₹{c.budget_monthly}</TableCell>
                    <TableCell>₹{c.cpl_limit}</TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => toggle(c)}>{c.status === "active" ? "Pause" : "Activate"}</Button></TableCell>
                  </TableRow>
                ))}
                {!items.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No campaigns yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        ⚠️ Actual publishing to Facebook/Google/LinkedIn Ads requires platform API credentials. Connect them in the Channels tab; campaigns above will sync once channels are configured.
      </p>
    </div>
  );
};

/* ============ WhatsApp TRIGGERS ============ */
const TriggersTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("mkt_auto_triggers" as any).select("*").eq("company_id", companyId).order("trigger_key");
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const save = async (t: any) => {
    await supabase.from("mkt_auto_triggers" as any).update({ message_body: t.message_body, is_enabled: t.is_enabled }).eq("id", t.id);
    toast({ title: "Saved" });
  };

  return (
    <Card>
      <CardHeader><CardTitle>WhatsApp Auto Triggers</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Loader2 className="animate-spin" /> : items.map((t) => (
          <div key={t.id} className="p-3 border rounded space-y-2">
            <div className="flex items-center justify-between">
              <div><div className="font-semibold text-sm">{t.label}</div><div className="text-xs text-muted-foreground">{t.trigger_key}</div></div>
              <Switch checked={t.is_enabled} onCheckedChange={(v) => { t.is_enabled = v; setItems([...items]); save(t); }} />
            </div>
            <Textarea rows={2} value={t.message_body} onChange={(e) => { t.message_body = e.target.value; setItems([...items]); }} onBlur={() => save(t)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Variables: {"{name}, {vehicle}, {expiry_date}, {ncb}, {phone}, {link}, {amount}, {policy_no}, {festival}, {product}, {payment_link}"}</p>
      </CardContent>
    </Card>
  );
};

/* ============ LEAD ROUTING ============ */
const RoutingTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", city: "", pincode: "", product: "", max_pending_per_agent: 5, hot_threshold: 50, warm_threshold: 30, escalate_after_min: 30 });

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("mkt_lead_routing_rules" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const create = async () => {
    if (!companyId || !form.name) return;
    const { error } = await supabase.from("mkt_lead_routing_rules" as any).insert({ ...form, company_id: companyId });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rule added" }); setForm({ ...form, name: "" }); load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Lead Scoring Defaults</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
          <div><strong>Source:</strong> FB +10, Google +15, Referral +20, Website +12</div>
          <div><strong>Product:</strong> Motor +10, Health +12, Loan +15, RTO +8</div>
          <div><strong>City tier:</strong> T1 +15, T2 +10, T3 +5</div>
          <div><strong>Urgency:</strong> Expiring 7d +20, 30d +15, new +5</div>
          <div className="md:col-span-3 text-xs text-muted-foreground">
            Hot ≥ {form.hot_threshold} • Warm {form.warm_threshold}-{form.hot_threshold} • Cold &lt; {form.warm_threshold}.
            Escalate to manager if no contact within {form.escalate_after_min} minutes.
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>New Routing Rule</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-2">
          <Input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          <Input placeholder="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          <Input type="number" placeholder="Max pending/agent" value={form.max_pending_per_agent} onChange={(e) => setForm({ ...form, max_pending_per_agent: +e.target.value })} />
          <Input type="number" placeholder="Hot threshold" value={form.hot_threshold} onChange={(e) => setForm({ ...form, hot_threshold: +e.target.value })} />
          <Input type="number" placeholder="Warm threshold" value={form.warm_threshold} onChange={(e) => setForm({ ...form, warm_threshold: +e.target.value })} />
          <Input type="number" placeholder="Escalate after (min)" value={form.escalate_after_min} onChange={(e) => setForm({ ...form, escalate_after_min: +e.target.value })} />
          <Button onClick={create} className="md:col-span-4"><Plus className="h-4 w-4 mr-1" />Add Rule</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Active Rules</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="animate-spin" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Pincode</TableHead>
                <TableHead>Product</TableHead><TableHead>Max/Agent</TableHead><TableHead>Escalate</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.city || "—"}</TableCell>
                    <TableCell>{r.pincode || "—"}</TableCell>
                    <TableCell>{r.product || "—"}</TableCell>
                    <TableCell>{r.max_pending_per_agent}</TableCell>
                    <TableCell>{r.escalate_after_min}m</TableCell>
                  </TableRow>
                ))}
                {!items.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No rules yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ============ CHANNELS ============ */
const ChannelsTab = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("mkt_channels" as any).select("*").eq("company_id", companyId);
    setItems((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const SETUP: Record<string, string> = {
    facebook: "Meta Developer App → Page Access Token (pages_manage_posts, pages_read_engagement).",
    instagram: "Same Meta app; IG Business account linked to a FB Page; instagram_basic + instagram_content_publish.",
    threads: "Meta Threads API access (currently invite-only).",
    linkedin: "LinkedIn Marketing app → 3-legged OAuth, Company URN, w_organization_social scope.",
    whatsapp: "WhatsApp Business API: WABA ID, Phone Number ID, permanent token, pre-approved templates.",
    gmb: "Google Business Profile API → OAuth client + refresh token; Location ID.",
    twitter: "X Developer Portal → Read+Write app, OAuth 1.0a consumer + access token (use api.x.com).",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Connected Channels</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="animate-spin" /> : (
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((c) => (
                <div key={c.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold">{c.display_name || c.platform}</div>
                    <Badge variant={c.status === "connected" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{SETUP[c.platform]}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Tell me when you're ready to connect a platform — I'll request the required API credentials securely and wire up live publishing.
          </p>
        </CardContent>
      </Card>

      {/* Marketing-scoped External API Registry — shares storage with the global API & Webhooks panel */}
      <ExternalApiRegistry lockedCategory="marketing" title="Marketing API Registry" />
    </div>
  );
};

/* ============ ANALYTICS ============ */
const AnalyticsTab = () => {
  const { companyId } = useAuth();
  const [stats, setStats] = useState({ spend: 0, leads: 0, conversions: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      if (!companyId) return;
      setLoading(true);
      const { data } = await supabase.from("mkt_campaign_metrics" as any).select("spend,leads,conversions,revenue").eq("company_id", companyId);
      const acc = (data as any[] || []).reduce((a, r) => ({
        spend: a.spend + Number(r.spend || 0), leads: a.leads + Number(r.leads || 0),
        conversions: a.conversions + Number(r.conversions || 0), revenue: a.revenue + Number(r.revenue || 0),
      }), { spend: 0, leads: 0, conversions: 0, revenue: 0 });
      setStats(acc); setLoading(false);
    })();
  }, [companyId]);

  const cpl = stats.leads ? (stats.spend / stats.leads).toFixed(0) : "—";
  const cpa = stats.conversions ? (stats.spend / stats.conversions).toFixed(0) : "—";
  const roas = stats.spend ? (stats.revenue / stats.spend).toFixed(2) + "x" : "—";

  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <div className="grid md:grid-cols-4 gap-3">
      {[
        { label: "Total Spend", value: `₹${stats.spend.toLocaleString()}` },
        { label: "Leads", value: stats.leads },
        { label: "Cost / Lead", value: cpl === "—" ? "—" : `₹${cpl}` },
        { label: "Cost / Acquisition", value: cpa === "—" ? "—" : `₹${cpa}` },
        { label: "Conversions", value: stats.conversions },
        { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}` },
        { label: "ROAS", value: roas },
      ].map((m) => (
        <Card key={m.label}><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{m.value}</div></CardContent>
        </Card>
      ))}
      <Card className="md:col-span-4"><CardContent className="text-xs text-muted-foreground pt-6">
        Metrics roll up from <code>mkt_campaign_metrics</code>. Once Facebook/Google/LinkedIn ad APIs are connected, daily spend/leads/CTR will sync automatically here.
      </CardContent></Card>
    </div>
  );
};

export default RocketMarketingEngine;
