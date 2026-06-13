import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Megaphone, Settings as SettingsIcon, Flag, Layers, Eye, ShieldAlert } from "lucide-react";

/* ---------- Global Settings ---------- */
export const GlobalSettingsPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const load = async () => {
    const { data } = await supabase.from("global_settings").select("*").order("setting_key");
    setRows(data ?? []);
    setDrafts(Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, JSON.stringify(r.setting_value)])));
  };
  useEffect(() => { load(); }, []);
  const save = async (key: string) => {
    let parsed: any;
    try { parsed = JSON.parse(drafts[key]); } catch { return toast({ title: "Invalid JSON", variant: "destructive" }); }
    const { error } = await supabase.from("global_settings").update({ setting_value: parsed, updated_by: (await supabase.auth.getUser()).data.user?.id }).eq("setting_key", key);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `${key} saved` }); load();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> Global Platform Settings</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.setting_key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto]">
            <div>
              <div className="font-mono text-xs font-semibold">{r.setting_key}</div>
              <div className="text-xs text-muted-foreground">{r.description}</div>
            </div>
            <Input className="font-mono text-xs" value={drafts[r.setting_key] ?? ""} onChange={(e) => setDrafts({ ...drafts, [r.setting_key]: e.target.value })} />
            <Button size="sm" onClick={() => save(r.setting_key)}>Save</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/* ---------- Feature Flags ---------- */
export const FeatureFlagsPanel = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [scope, setScope] = useState<string>("global");
  const [newKey, setNewKey] = useState("");

  const load = async () => {
    const [f, c] = await Promise.all([
      supabase.from("feature_flags").select("*").order("flag_key"),
      supabase.from("companies").select("id,name").order("name"),
    ]);
    setFlags(f.data ?? []); setCompanies(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const visible = flags.filter((f) => scope === "global" ? f.company_id === null : f.company_id === scope);

  const toggle = async (f: any) => {
    await supabase.from("feature_flags").update({ is_enabled: !f.is_enabled }).eq("id", f.id);
    load();
  };
  const addOverride = async (flag_key: string) => {
    if (scope === "global") return;
    const existing = flags.find((f) => f.flag_key === flag_key && f.company_id === scope);
    if (existing) return toast({ title: "Already exists" });
    await supabase.from("feature_flags").insert({ flag_key, company_id: scope, is_enabled: true });
    load();
  };
  const del = async (id: string) => { await supabase.from("feature_flags").delete().eq("id", id); load(); };
  const addNewGlobal = async () => {
    if (!newKey.trim()) return;
    await supabase.from("feature_flags").insert({ flag_key: newKey.trim(), company_id: null, is_enabled: true });
    setNewKey(""); load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-primary" /> Feature Flags</CardTitle>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">🌐 Global defaults</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {scope === "global" && (
          <div className="flex gap-2">
            <Input placeholder="new_flag_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Button onClick={addNewGlobal}><Plus className="h-4 w-4" /> Add Flag</Button>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Flag</TableHead><TableHead>Enabled</TableHead><TableHead>Description</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {scope === "global" ? visible.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.flag_key}</TableCell>
                <TableCell><Switch checked={f.is_enabled} onCheckedChange={() => toggle(f)} /></TableCell>
                <TableCell className="text-xs">{f.description ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            )) : flags.filter((f) => f.company_id === null).map((g) => {
              const override = flags.find((f) => f.flag_key === g.flag_key && f.company_id === scope);
              return (
                <TableRow key={g.flag_key}>
                  <TableCell className="font-mono text-xs">{g.flag_key}</TableCell>
                  <TableCell>
                    {override ? <Switch checked={override.is_enabled} onCheckedChange={() => toggle(override)} /> : <Badge variant="outline">Global: {g.is_enabled ? "ON" : "OFF"}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{g.description ?? "—"}</TableCell>
                  <TableCell>
                    {override ? <Button size="icon" variant="ghost" onClick={() => del(override.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      : <Button size="sm" variant="outline" onClick={() => addOverride(g.flag_key)}>Override</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ---------- Announcements ---------- */
export const AnnouncementsPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", target: "all", show_until: "" });
  const load = async () => { const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.title || !form.message) return toast({ title: "Title + message required", variant: "destructive" });
    const u = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from("announcements").insert({ ...form, show_until: form.show_until || null, created_by: u });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Announcement sent" }); setOpen(false); setForm({ title: "", message: "", type: "info", target: "all", show_until: "" }); load();
  };
  const del = async (id: string) => { await supabase.from("announcements").delete().eq("id", id); load(); };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Announcements</CardTitle>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Until</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No announcements.</TableCell></TableRow> : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground line-clamp-1">{r.message}</div></TableCell>
                <TableCell><Badge variant={r.type === "critical" ? "destructive" : "secondary"}>{r.type}</Badge></TableCell>
                <TableCell className="text-xs">{r.target}</TableCell>
                <TableCell className="text-xs">{r.show_until ? new Date(r.show_until).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Show until</Label><Input type="datetime-local" value={form.show_until} onChange={(e) => setForm({ ...form, show_until: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={create}>Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ---------- Plan Templates ---------- */
export const PlanTemplatesPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => { const { data } = await supabase.from("plan_templates").select("*").order("sort_order"); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: any) => { await supabase.from("plan_templates").update(patch).eq("id", id); load(); };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Plan Templates</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Monthly ₹</TableHead><TableHead>Yearly ₹</TableHead><TableHead>Max Users</TableHead><TableHead>Modules</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.plan_name}</TableCell>
                <TableCell><Input className="w-24 h-8" type="number" defaultValue={r.monthly_price} onBlur={(e) => update(r.id, { monthly_price: Number(e.target.value) })} /></TableCell>
                <TableCell><Input className="w-28 h-8" type="number" defaultValue={r.yearly_price} onBlur={(e) => update(r.id, { yearly_price: Number(e.target.value) })} /></TableCell>
                <TableCell><Input className="w-20 h-8" type="number" defaultValue={r.max_users ?? ""} onBlur={(e) => update(r.id, { max_users: e.target.value ? Number(e.target.value) : null })} /></TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{(r.included_modules ?? []).map((m: string) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div></TableCell>
                <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ---------- Super Admin Audit Log ---------- */
export const SuperAdminAuditPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [view, setView] = useState<any>(null);
  const load = async () => { const { data } = await supabase.from("super_admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Platform Audit Log</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Description</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No entries.</TableCell></TableRow> : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell><Badge variant="secondary">{r.action_type}</Badge></TableCell>
                <TableCell className="text-xs">{r.description}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => setView(r)}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{view?.action_type}</DialogTitle></DialogHeader>
            <pre className="max-h-[400px] overflow-auto rounded border bg-muted p-2 text-[10px]">{JSON.stringify(view, null, 2)}</pre>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
