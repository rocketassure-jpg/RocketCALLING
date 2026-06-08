import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, Loader2, Users, Shuffle, MapPin, User, Calendar as CalendarIcon, Flame, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Manager = { id: string; full_name: string };

type Area = { id: string; name: string };
type Profile = { id: string; full_name: string };

const TARGETS: { key: string; label: string; required?: boolean }[] = [
  { key: "customer_name", label: "Customer Name *", required: true },
  { key: "phone_number", label: "Phone Number *", required: true },
  { key: "area_name", label: "Area Name" },
  { key: "policy_type", label: "Policy Type (Life/Health/Motor)" },
  { key: "call_date", label: "Call Date" },
  { key: "premium_amount", label: "Premium Amount" },
];
const SKIP = "__skip__";
const POLICIES = ["Life", "Health", "Motor"];
const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const autoMap = (header: string): string => {
  const h = norm(header);
  for (const t of TARGETS) if (norm(t.key) === h || norm(t.label) === h) return t.key;
  if (h.includes("name") && !h.includes("area")) return "customer_name";
  if (h.includes("phone") || h.includes("mobile") || h.includes("contact")) return "phone_number";
  if (h.includes("area") || h.includes("city")) return "area_name";
  if (h.includes("policy") || h.includes("type")) return "policy_type";
  if (h.includes("date")) return "call_date";
  if (h.includes("premium") || h.includes("amount")) return "premium_amount";
  return SKIP;
};

type AssignMode = "none" | "single" | "roundrobin" | "byarea";

export const SmartImportPanel = ({ areas, telecallers, onDone }: { areas: Area[]; telecallers: Profile[]; onDone: () => void }) => {
  const { user } = useAuth();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultArea, setDefaultArea] = useState("");
  const [assignMode, setAssignMode] = useState<AssignMode>("none");
  const [singleTelecaller, setSingleTelecaller] = useState("");
  const [rrSelected, setRrSelected] = useState<Set<string>>(new Set());
  const [areaTelecallerMap, setAreaTelecallerMap] = useState<Record<string, string[]>>({});
  const [importing, setImporting] = useState(false);

  // NEW: Campaign / deadline / priority / manager
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerId, setManagerId] = useState<string>("none");
  const [campaignName, setCampaignName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");

  // Load managers
  useEffect(() => {
    supabase.from("user_roles").select("user_id, profiles(id,full_name)").eq("role", "manager").then(({ data }) => {
      const list = (data ?? []).map((r: any) => r.profiles).filter(Boolean) as Manager[];
      setManagers(list);
    });
  }, []);

  // Load telecaller_areas for byarea mode
  useEffect(() => {
    if (assignMode !== "byarea") return;
    supabase.from("telecaller_areas").select("area_id, telecaller_id").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: any) => {
        (map[r.area_id] ||= []).push(r.telecaller_id);
      });
      setAreaTelecallerMap(map);
    });
  }, [assignMode]);


  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsedRows: Record<string, any>[] = [];
    let parsedHeaders: string[] = [];
    if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      parsedHeaders = parsedRows.length ? Object.keys(parsedRows[0]) : [];
    } else {
      const text = await file.text();
      const res = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
      parsedRows = res.data;
      parsedHeaders = res.meta.fields ?? [];
    }
    if (!parsedHeaders.length) return toast({ title: "Empty file", variant: "destructive" });
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    const m: Record<string, string> = {};
    parsedHeaders.forEach((h) => (m[h] = autoMap(h)));
    setMapping(m);
  };

  const mapped = useMemo(() => Object.values(mapping), [mapping]);
  const hasRequired = mapped.includes("customer_name") && mapped.includes("phone_number");

  const preview = useMemo(() => rows.slice(0, 5).map((r) => {
    const o: any = {};
    Object.entries(mapping).forEach(([col, target]) => {
      if (target !== SKIP) o[target] = r[col];
    });
    return o;
  }), [rows, mapping]);

  const toggleRr = (id: string) => setRrSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const pickAssignee = (areaId: string, idx: number, rrList: string[]): string | null => {
    if (assignMode === "single") return singleTelecaller || null;
    if (assignMode === "roundrobin") return rrList.length ? rrList[idx % rrList.length] : null;
    if (assignMode === "byarea") {
      const pool = areaTelecallerMap[areaId] ?? [];
      return pool.length ? pool[idx % pool.length] : null;
    }
    return null;
  };

  const doImport = async () => {
    if (!defaultArea) return toast({ title: "Default area select karo", variant: "destructive" });
    if (assignMode === "single" && !singleTelecaller) return toast({ title: "Telecaller select karo", variant: "destructive" });
    if (assignMode === "roundrobin" && rrSelected.size === 0) return toast({ title: "Round-robin ke liye telecallers select karo", variant: "destructive" });
    setImporting(true);
    const areaMap = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));
    const rrList = Array.from(rrSelected);
    const inserts: any[] = [];
    const assignCounts: Record<string, number> = {};
    let skipped = 0, unassigned = 0, idx = 0;
    rows.forEach((r) => {
      const o: any = {
        area_id: defaultArea, policy_type: "Motor", call_date: today(), lead_source: "Smart Import",
        priority,
      };
      if (managerId && managerId !== "none") o.manager_id = managerId;
      if (campaignName.trim()) o.campaign_name = campaignName.trim();
      if (deadline) o.deadline = deadline;
      Object.entries(mapping).forEach(([col, target]) => {
        if (target === SKIP) return;
        let v: any = r[col];
        if (v === undefined || v === null || v === "") return;
        if (target === "area_name") {
          const id = areaMap.get(String(v).toLowerCase());
          if (id) o.area_id = id;
        } else if (target === "policy_type") {
          o.policy_type = POLICIES.includes(String(v)) ? v : "Motor";
        } else if (target === "premium_amount") {
          o.premium_amount = Number(String(v).replace(/[^\d.-]/g, "")) || 0;
        } else if (target === "phone_number") {
          o.phone_number = String(v).replace(/\D/g, "").slice(-10);
        } else {
          o[target] = String(v).trim();
        }
      });
      if (!o.customer_name || !o.phone_number) { skipped++; return; }
      const assignee = pickAssignee(o.area_id, idx, rrList);
      if (assignee) {
        o.assigned_telecaller = assignee;
        assignCounts[assignee] = (assignCounts[assignee] || 0) + 1;
      } else if (assignMode !== "none") {
        unassigned++;
      }
      inserts.push(o);
      idx++;
    });


    let inserted = 0;
    for (let i = 0; i < inserts.length; i += 100) {
      const chunk = inserts.slice(i, i + 100);
      const { error, count } = await supabase.from("leads").insert(chunk, { count: "exact" });
      if (!error) inserted += count ?? chunk.length;
    }
    setImporting(false);
    const tcName = (id: string) => telecallers.find((t) => t.id === id)?.full_name || id.slice(0, 6);
    const distSummary = Object.entries(assignCounts).map(([id, n]) => `${tcName(id)}: ${n}`).join(", ");
    toast({
      title: `✓ ${inserted} leads imported`,
      description: [
        skipped ? `${skipped} skipped` : null,
        unassigned ? `${unassigned} unassigned` : null,
        distSummary || null,
      ].filter(Boolean).join(" • ") || undefined,
    });
    setRows([]); setHeaders([]); setMapping({}); setRrSelected(new Set());
    onDone();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Smart Import (CSV / Excel)</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Default Area * (fallback)</Label>
            <Select value={defaultArea} onValueChange={setDefaultArea}>
              <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>File (.csv / .xlsx)</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        </div>

        {/* Campaign / Manager / Deadline / Priority */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Briefcase className="h-4 w-4 text-primary" /> Campaign &amp; Assignment Details</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Campaign / List Name</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. June Renewals" />
            </div>
            <div className="space-y-1.5">
              <Label>Assign Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Follow-up Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> Priority</Label>
              <div className="flex gap-1">
                {(["normal", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition ${priority === p ? (p === "urgent" ? "border-destructive bg-destructive/10 text-destructive" : p === "high" ? "border-warning bg-warning/10 text-warning-foreground" : "border-primary bg-primary/10") : "hover:bg-muted"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>



        {/* Assignment flow */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Lead Assignment</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { v: "none", label: "Unassigned", icon: User },
              { v: "single", label: "Single Telecaller", icon: User },
              { v: "roundrobin", label: "Round Robin", icon: Shuffle },
              { v: "byarea", label: "By Area Map", icon: MapPin },
            ].map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setAssignMode(v as AssignMode)}
                className={`flex items-center gap-2 rounded-md border p-2 text-xs transition ${assignMode === v ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {assignMode === "single" && (
            <Select value={singleTelecaller} onValueChange={setSingleTelecaller}>
              <SelectTrigger><SelectValue placeholder="Choose telecaller" /></SelectTrigger>
              <SelectContent>
                {telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {assignMode === "roundrobin" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Leads in tabhi {rrSelected.size || 0} telecallers ke beech evenly distribute honge.</p>
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
                {telecallers.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 rounded border p-2 text-xs cursor-pointer hover:bg-muted">
                    <Checkbox checked={rrSelected.has(t.id)} onCheckedChange={() => toggleRr(t.id)} />
                    <span className="truncate">{t.full_name || t.id.slice(0, 8)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {assignMode === "byarea" && (
            <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">
              Har lead apne area ke assigned telecallers ko round-robin se milega. Areas without telecallers → unassigned.
              <div className="mt-2 flex flex-wrap gap-1">
                {areas.map((a) => {
                  const count = areaTelecallerMap[a.id]?.length ?? 0;
                  return <Badge key={a.id} variant={count ? "default" : "outline"}>{a.name}: {count}</Badge>;
                })}
              </div>
            </div>
          )}
        </div>

        {headers.length > 0 && (
          <>
            <div className="rounded-lg border">
              <div className="border-b bg-muted/40 p-3 text-sm font-semibold">Column Mapping ({headers.length} columns found)</div>
              <div className="max-h-80 divide-y overflow-y-auto">
                {headers.map((h) => {
                  const auto = autoMap(h);
                  const isAuto = mapping[h] === auto && auto !== SKIP;
                  return (
                    <div key={h} className="grid grid-cols-2 items-center gap-3 p-2 text-sm">
                      <div className={`truncate font-medium ${isAuto ? "text-success" : ""}`}>{h}</div>
                      <Select value={mapping[h] ?? SKIP} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>— Skip —</SelectItem>
                          {TARGETS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {preview.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold">Preview (first 5 rows)</div>
                <div className="overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted"><tr>{Object.keys(preview[0] || {}).map((k) => <th key={k} className="p-2 text-left">{k}</th>)}</tr></thead>
                    <tbody>{preview.map((r, i) => (
                      <tr key={i} className="border-t">{Object.keys(preview[0] || {}).map((k) => <td key={k} className="p-2">{String(r[k] ?? "")}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            <Button variant="hero" size="lg" className="w-full" onClick={doImport} disabled={!hasRequired || importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Import {rows.length} leads
            </Button>
            {!hasRequired && <p className="text-center text-xs text-warning">Customer Name aur Phone Number map karna zaroori hai.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};
