import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCw, Save, Pencil, X, Globe, Sparkles } from "lucide-react";

type Preset = { name: string; usecase: string; url: string; remark: string; category: string };

const API_PRESETS: Preset[] = [
  { name: "Meta / Facebook Graph", usecase: "FB Page posts, Instagram, Ads", url: "https://graph.facebook.com/v19.0/me", remark: "Get from developers.facebook.com — Free (limits apply)", category: "social" },
  { name: "WhatsApp Business Cloud", usecase: "WA messaging, templates", url: "https://graph.facebook.com/v19.0/", remark: "business.facebook.com — Free 1000 conv/month", category: "communication" },
  { name: "Google Ads", usecase: "Lead form ads, campaigns", url: "https://googleads.googleapis.com/v17/customers", remark: "ads.google.com/aw/apicenter — Free API (ad spend separate)", category: "marketing" },
  { name: "Google My Business", usecase: "GMB posts, reviews", url: "https://mybusinessbusinessinformation.googleapis.com/v1/", remark: "console.cloud.google.com — Free", category: "marketing" },
  { name: "LinkedIn Marketing", usecase: "Company page posts, ads", url: "https://api.linkedin.com/v2/", remark: "developer.linkedin.com — Free basic / Paid marketing", category: "social" },
  { name: "OpenAI", usecase: "AI content / image generation", url: "https://api.openai.com/v1/models", remark: "platform.openai.com — ~$0.002/1K tokens", category: "ai" },
  { name: "Canva", usecase: "Auto-design creatives", url: "https://api.canva.com/rest/v1/", remark: "canva.com/developers — Free tier", category: "marketing" },
  { name: "Twilio", usecase: "SMS / voice / WhatsApp", url: "https://api.twilio.com/2010-04-01/", remark: "twilio.com — ~₹0.5/SMS pay-as-you-go", category: "communication" },
  { name: "Razorpay", usecase: "Payments & subscriptions", url: "https://api.razorpay.com/v1/", remark: "razorpay.com — 2% transaction fee", category: "payment" },
];
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  company_id: string;
  name: string;
  usecase: string | null;
  url: string | null;
  api_key: string | null;
  remark: string | null;
  status: string;
  category: string;
  last_checked_at: string | null;
  last_check_result: string | null;
};

export const API_CATEGORIES: { value: string; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "communication", label: "Communication (SMS/WA/Email)" },
  { value: "ai", label: "AI / LLM" },
  { value: "payment", label: "Payments" },
  { value: "social", label: "Social Media" },
  { value: "analytics", label: "Analytics / Tracking" },
  { value: "crm", label: "CRM / Lead Sources" },
  { value: "general", label: "General / Other" },
];

const maskKey = (k?: string | null) => {
  if (!k) return "—";
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "connected") return "default";
  if (s === "failed") return "destructive";
  if (s === "disabled") return "outline";
  return "secondary";
};

interface Props {
  /** Lock the registry to a single category — used inside scoped panels (e.g. Marketing). */
  lockedCategory?: string;
  title?: string;
}

export const ExternalApiRegistry = ({ lockedCategory, title }: Props = {}) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Row>>({});
  const [filter, setFilter] = useState<string>(lockedCategory ?? "all");
  const [newRow, setNewRow] = useState({
    name: "", usecase: "", url: "", api_key: "", remark: "",
    category: lockedCategory ?? "general",
  });
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    setCompanyId(prof?.company_id ?? null);
    const { data } = await supabase
      .from("external_api_registry" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visibleRows = useMemo(() => {
    const cat = lockedCategory ?? filter;
    if (cat === "all") return rows;
    return rows.filter((r) => (r.category || "general") === cat);
  }, [rows, filter, lockedCategory]);

  const add = async () => {
    if (!newRow.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (!companyId) return toast({ title: "No company context", variant: "destructive" });
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("external_api_registry" as any).insert({
      company_id: companyId,
      name: newRow.name.trim(),
      usecase: newRow.usecase.trim() || null,
      url: newRow.url.trim() || null,
      api_key: newRow.api_key.trim() || null,
      remark: newRow.remark.trim() || null,
      category: newRow.category || "general",
      status: newRow.api_key.trim() ? "pending" : "disabled",
      created_by: user?.id ?? null,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewRow({ name: "", usecase: "", url: "", api_key: "", remark: "", category: lockedCategory ?? "general" });
    toast({ title: "API added" });
    load();
  };

  const startEdit = (r: Row) => { setEditingId(r.id); setDraft({ ...r }); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("external_api_registry" as any).update({
      name: draft.name?.toString().trim() || "",
      usecase: draft.usecase ?? null,
      url: draft.url ?? null,
      api_key: draft.api_key ?? null,
      remark: draft.remark ?? null,
      category: draft.category || "general",
      status: draft.status ?? "pending",
    }).eq("id", editingId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    cancelEdit();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this API entry?")) return;
    await supabase.from("external_api_registry" as any).delete().eq("id", id);
    load();
  };

  const checkOne = async (r: Row) => {
    if (!r.url) {
      toast({ title: "No URL set", variant: "destructive" });
      return;
    }
    setCheckingId(r.id);
    let status = "failed";
    let result = "";
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const headers: Record<string, string> = {};
      if (r.api_key) {
        headers["Authorization"] = `Bearer ${r.api_key}`;
        headers["x-api-key"] = r.api_key;
      }
      const res = await fetch(r.url, { method: "GET", headers, mode: "cors", signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok || (res.status >= 200 && res.status < 500)) {
        status = res.ok ? "connected" : "pending";
        result = `HTTP ${res.status}`;
      } else {
        status = "failed";
        result = `HTTP ${res.status}`;
      }
    } catch (e: any) {
      status = "failed";
      result = e?.message?.includes("aborted") ? "Timeout (8s)" : (e?.message || "Network error / CORS blocked");
    }
    await supabase.from("external_api_registry" as any).update({
      status,
      last_checked_at: new Date().toISOString(),
      last_check_result: result,
    }).eq("id", r.id);
    setCheckingId(null);
    toast({ title: `${r.name}: ${status}`, description: result });
    load();
  };

  const checkAll = async () => {
    for (const r of visibleRows) {
      if (r.url) await checkOne(r);
    }
  };

  const seedPresets = async () => {
    if (!companyId) return toast({ title: "No company context", variant: "destructive" });
    const { data: { user } } = await supabase.auth.getUser();
    const targetCat = lockedCategory;
    const existing = new Set(rows.map((r) => r.name.toLowerCase()));
    const toInsert = API_PRESETS
      .filter((p) => !targetCat || p.category === targetCat)
      .filter((p) => !existing.has(p.name.toLowerCase()))
      .map((p) => ({
        company_id: companyId,
        name: p.name,
        usecase: p.usecase,
        url: p.url,
        api_key: null,
        remark: p.remark,
        category: targetCat ?? p.category,
        status: "pending",
        created_by: user?.id ?? null,
      }));
    if (toInsert.length === 0) return toast({ title: "All presets already added" });
    const { error } = await supabase.from("external_api_registry" as any).insert(toInsert);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: `Added ${toInsert.length} preset APIs`, description: "Fill in keys and click Refresh to verify." });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> {title ?? "External API Registry"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!lockedCategory && (
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Filter category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {API_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={seedPresets} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-1" /> Add preset APIs
            </Button>
            <Button variant="outline" size="sm" onClick={checkAll} disabled={loading || visibleRows.length === 0}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh All
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lockedCategory
            ? "Scoped to this section — entries you add here also appear in the global API & Webhooks panel."
            : "Save third-party APIs you plan to use. Click 'Add preset APIs' to load Meta, WhatsApp, Google Ads, GMB, LinkedIn, OpenAI, Canva, Twilio, Razorpay — then paste keys later."}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new */}
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="text-sm font-semibold">Add API</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Name *" value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} />
            <Input placeholder="Use case" value={newRow.usecase} onChange={(e) => setNewRow({ ...newRow, usecase: e.target.value })} />
            <Input placeholder="URL (https://…)" value={newRow.url} onChange={(e) => setNewRow({ ...newRow, url: e.target.value })} />
            <Input placeholder="API Key (optional)" value={newRow.api_key} onChange={(e) => setNewRow({ ...newRow, api_key: e.target.value })} />
            <Input placeholder="Remark" value={newRow.remark} onChange={(e) => setNewRow({ ...newRow, remark: e.target.value })} />
            <Select value={newRow.category} onValueChange={(v) => setNewRow({ ...newRow, category: v })} disabled={!!lockedCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {API_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Use case</th>
                <th className="py-2 pr-2">URL</th>
                <th className="py-2 pr-2">API Key</th>
                <th className="py-2 pr-2">Remark</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Last check</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">No APIs in this category yet.</td></tr>
              )}
              {visibleRows.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-2">
                      {editing
                        ? <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        : <span className="font-medium">{r.name}</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <Select value={draft.category ?? "general"} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {API_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize text-xs">{r.category || "general"}</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editing
                        ? <Input value={draft.usecase ?? ""} onChange={(e) => setDraft({ ...draft, usecase: e.target.value })} />
                        : <span className="text-muted-foreground">{r.usecase || "—"}</span>}
                    </td>
                    <td className="py-2 pr-2 max-w-[220px]">
                      {editing
                        ? <Input value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
                        : r.url
                          ? <a href={r.url} target="_blank" rel="noreferrer" className="text-primary underline text-xs break-all">{r.url}</a>
                          : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {editing
                        ? <Input type="password" placeholder="Paste key" value={draft.api_key ?? ""} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} />
                        : <span className="font-mono text-xs">{maskKey(r.api_key)}</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {editing
                        ? <Input value={draft.remark ?? ""} onChange={(e) => setDraft({ ...draft, remark: e.target.value })} />
                        : <span className="text-muted-foreground text-xs">{r.remark || "—"}</span>}
                    </td>
                    <td className="py-2 pr-2">
                      <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">
                      {r.last_checked_at ? new Date(r.last_checked_at).toLocaleString() : "Never"}
                      {r.last_check_result && <div className="opacity-70">{r.last_check_result}</div>}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <Button size="sm" variant="outline" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => checkOne(r)} disabled={checkingId === r.id} title="Test connection">
                              <RefreshCw className={`h-4 w-4 ${checkingId === r.id ? "animate-spin" : ""}`} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(r.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
