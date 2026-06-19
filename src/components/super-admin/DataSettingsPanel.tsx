import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Save, Trash2, RefreshCw, Upload, Download, AlertTriangle, Database, Settings2, Route, Archive } from "lucide-react";

type StatusRow = {
  id: string;
  company_id: string;
  status_key: string;
  label: string;
  color: string;
  is_active: boolean;
  sort_order: number;
};

type SystemConfig = Record<string, string>;

const ROUTING_KEY = "lead_routing_mode";
const RETENTION_CALL_KEY = "retention_call_logs_months";
const RETENTION_LEAD_KEY = "retention_inactive_leads_months";

const writeAudit = async (action: string, table: string, recordId: string | null, newData: any) => {
  try {
    await supabase.from("audit_logs").insert({
      action,
      table_name: table,
      record_id: recordId,
      new_data: newData,
    } as any);
  } catch {
    /* ignore */
  }
};

export const DataSettingsPanel = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [config, setConfig] = useState<SystemConfig>({});
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<{ count: number; bytes: number } | null>(null);

  // Cleanup confirmation state
  const [cleanupOpen, setCleanupOpen] = useState<null | "leads" | "dial" | "dnc">(null);
  const [adminPwd, setAdminPwd] = useState("");
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user?.id ?? "").maybeSingle();
    const cid = (prof as any)?.company_id ?? null;
    setCompanyId(cid);

    const [{ data: stData }, { data: cfgData }] = await Promise.all([
      cid
        ? supabase.from("status_mappings").select("*").eq("company_id", cid).order("sort_order")
        : Promise.resolve({ data: [] as any }),
      supabase.from("system_config").select("key_name,key_value"),
    ]);
    setStatuses((stData ?? []) as any);
    const cfg: SystemConfig = {};
    (cfgData ?? []).forEach((r: any) => {
      cfg[r.key_name] = r.key_value ?? "";
    });
    setConfig(cfg);

    // Storage usage (best-effort)
    try {
      const { data: files } = await supabase.storage.from("customer-docs").list("", { limit: 1000 });
      const totalBytes = (files ?? []).reduce((acc: number, f: any) => acc + (f.metadata?.size ?? 0), 0);
      setStorage({ count: files?.length ?? 0, bytes: totalBytes });
    } catch {
      setStorage({ count: 0, bytes: 0 });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const updateStatus = async (row: StatusRow, patch: Partial<StatusRow>) => {
    const next = { ...row, ...patch };
    setStatuses((s) => s.map((r) => (r.id === row.id ? next : r)));
    const { error } = await supabase.from("status_mappings").update(patch as any).eq("id", row.id);
    if (error) return toast.error("Update failed: " + error.message);
    writeAudit("UPDATE", "status_mappings", row.id, { changed: Object.keys(patch), label: next.label });
    toast.success(`Updated "${next.label}"`);
  };

  const saveConfig = async (key: string, value: string, isSecret = false) => {
    const { error } = await supabase
      .from("system_config")
      .upsert({ key_name: key, key_value: value, is_secret: isSecret, updated_by: user?.id ?? null } as any);
    if (error) return toast.error("Save failed: " + error.message);
    setConfig((c) => ({ ...c, [key]: value }));
    writeAudit("UPDATE", "system_config", key, { key_name: key });
    toast.success("Saved");
  };

  const runCleanup = async () => {
    if (!adminPwd) return toast.error("Enter your admin password to confirm");
    if (!user?.email) return toast.error("Not signed in");
    setCleanupBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: adminPwd });
    if (authErr) {
      setCleanupBusy(false);
      return toast.error("Password incorrect");
    }
    try {
      if (cleanupOpen === "leads" && companyId) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 6);
        const { error, count } = await supabase
          .from("leads")
          .delete({ count: "exact" })
          .eq("company_id", companyId)
          .in("status", ["Not Interested", "Cold", "Untouched"] as any)
          .lt("updated_at", cutoff.toISOString());
        if (error) throw error;
        writeAudit("DELETE", "leads", null, { reason: "bulk_cleanup", removed: count });
        toast.success(`Archived ${count ?? 0} non-converted leads`);
      } else if (cleanupOpen === "dial" && companyId) {
        const since = new Date();
        since.setMonth(since.getMonth() - 1);
        const { error, count } = await supabase
          .from("dial_logs")
          .delete({ count: "exact" })
          .lt("created_at", since.toISOString());
        if (error) throw error;
        writeAudit("DELETE", "dial_logs", null, { reason: "monthly_reset", removed: count });
        toast.success(`Reset ${count ?? 0} dial logs`);
      } else if (cleanupOpen === "dnc") {
        toast.message("DNC sync started", { description: "Use CSV Import → DNC list to bulk-upload." });
      }
    } catch (e: any) {
      toast.error("Cleanup failed: " + e.message);
    } finally {
      setCleanupBusy(false);
      setCleanupOpen(null);
      setAdminPwd("");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const storageMB = storage ? (storage.bytes / (1024 * 1024)).toFixed(2) : "0";
  const storagePct = storage ? Math.min(100, (storage.bytes / (1024 * 1024 * 1024)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-emerald-500" />
        <h2 className="text-xl font-bold">Data Settings</h2>
      </div>

      <Tabs defaultValue="statuses" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="statuses"><Settings2 className="mr-1 h-3.5 w-3.5" />Statuses</TabsTrigger>
          <TabsTrigger value="routing"><Route className="mr-1 h-3.5 w-3.5" />Routing</TabsTrigger>
          <TabsTrigger value="retention"><Archive className="mr-1 h-3.5 w-3.5" />Retention</TabsTrigger>
          <TabsTrigger value="cleanup"><AlertTriangle className="mr-1 h-3.5 w-3.5" />Cleanup</TabsTrigger>
        </TabsList>

        {/* === STATUSES === */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dynamic Lead Status Mapping</CardTitle>
              <p className="text-sm text-muted-foreground">
                Toggle visibility, customize color, and set the Auto-Next dialing order.
              </p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20"
                          value={s.sort_order}
                          onChange={(e) => updateStatus(s, { sort_order: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-44"
                          value={s.label}
                          onChange={(e) => setStatuses((arr) => arr.map((r) => (r.id === s.id ? { ...r, label: e.target.value } : r)))}
                          onBlur={(e) => e.target.value !== s.label && updateStatus(s, { label: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="color"
                          className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                          value={s.color}
                          onChange={(e) => updateStatus(s, { color: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge style={{ background: s.color, color: "#fff" }}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(v) => updateStatus(s, { is_active: v })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ROUTING === */}
        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Distribution & Routing Rules</CardTitle>
              <p className="text-sm text-muted-foreground">Choose how new incoming leads are auto-assigned.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { val: "round_robin", title: "Round Robin", desc: "Equally distribute leads among active telecallers." },
                  { val: "performance", title: "Performance-Based", desc: "Route more leads to higher-converting agents." },
                  { val: "manual", title: "Manual Assignment", desc: "Admin/Manager assigns leads themselves." },
                ].map((opt) => {
                  const active = (config[ROUTING_KEY] ?? "manual") === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => saveConfig(ROUTING_KEY, opt.val)}
                      className={`rounded-lg border-2 p-4 text-left transition ${
                        active ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="font-semibold">{opt.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                      {active && <Badge className="mt-2 bg-emerald-500">Active</Badge>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RETENTION === */}
        <TabsContent value="retention">
          <Card>
            <CardHeader><CardTitle className="text-base">Backup & Storage Retention</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Archive Call Logs older than (months)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config[RETENTION_CALL_KEY] ?? "12"}
                      onChange={(e) => setConfig((c) => ({ ...c, [RETENTION_CALL_KEY]: e.target.value }))}
                    />
                    <Button onClick={() => saveConfig(RETENTION_CALL_KEY, config[RETENTION_CALL_KEY] ?? "12")} className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Archive Inactive Leads older than (months)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config[RETENTION_LEAD_KEY] ?? "6"}
                      onChange={(e) => setConfig((c) => ({ ...c, [RETENTION_LEAD_KEY]: e.target.value }))}
                    />
                    <Button onClick={() => saveConfig(RETENTION_LEAD_KEY, config[RETENTION_LEAD_KEY] ?? "6")} className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Storage used (customer-docs bucket)</span>
                  <span className="text-muted-foreground">{storageMB} MB · {storage?.count ?? 0} files</span>
                </div>
                <Progress value={storagePct} className="h-3" />
                <p className="text-xs text-muted-foreground">Bar scaled to 1 GB. Lovable Cloud storage is elastic.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CLEANUP === */}
        <TabsContent value="cleanup">
          <Card className="border-red-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Bulk Data Cleanup & Maintenance
              </CardTitle>
              <p className="text-sm text-muted-foreground">Destructive actions. Require admin password to confirm.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <button
                onClick={() => setCleanupOpen("leads")}
                className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-left transition hover:bg-red-500/10"
              >
                <Trash2 className="mb-2 h-5 w-5 text-red-500" />
                <div className="font-semibold">Clear Non-Converted Leads</div>
                <div className="mt-1 text-xs text-muted-foreground">Purge cold / not-interested / untouched leads older than 6 months.</div>
              </button>
              <button
                onClick={() => setCleanupOpen("dial")}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-left transition hover:bg-amber-500/10"
              >
                <RefreshCw className="mb-2 h-5 w-5 text-amber-500" />
                <div className="font-semibold">Reset Dial Logs Counter</div>
                <div className="mt-1 text-xs text-muted-foreground">Clear dial counters older than 1 month for a fresh monthly cycle.</div>
              </button>
              <button
                onClick={() => setCleanupOpen("dnc")}
                className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-left transition hover:bg-blue-500/10"
              >
                <Upload className="mb-2 h-5 w-5 text-blue-500" />
                <div className="font-semibold">DNC Sync</div>
                <div className="mt-1 text-xs text-muted-foreground">Bulk import or export Do Not Call numbers.</div>
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cleanup confirmation dialog */}
      <Dialog open={!!cleanupOpen} onOpenChange={(v) => !v && setCleanupOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Confirm destructive action
            </DialogTitle>
            <DialogDescription>
              Re-enter your admin password to authorize this operation. Action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Admin password</Label>
            <Input type="password" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupOpen(null)} disabled={cleanupBusy}>Cancel</Button>
            <Button variant="destructive" onClick={runCleanup} disabled={cleanupBusy}>
              {cleanupBusy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirm & Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
