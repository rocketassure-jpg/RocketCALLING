import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Phone, Loader2, Search } from "lucide-react";

type Row = {
  id: string;
  called_at: string;
  status: string;
  notes: string | null;
  telecaller_name: string;
  customer_name: string;
  phone: string;
  area: string;
  policy_type: string;
};

const startOf = (mode: "today" | "7d" | "30d" | "all") => {
  if (mode === "all") return new Date(0);
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (mode === "7d") d.setDate(d.getDate() - 6);
  if (mode === "30d") d.setDate(d.getDate() - 29);
  return d;
};

const statusColors: Record<string, string> = {
  Interested: "bg-success/15 text-success",
  Converted: "bg-primary/15 text-primary",
  "Not Interested": "bg-destructive/15 text-destructive",
  "Follow-up": "bg-warning/15 text-warning",
  "Not Picked": "bg-muted text-muted-foreground",
};

export const CallReportsPanel = () => {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tcFilter, setTcFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const since = startOf(range).toISOString();
      const { data } = await supabase
        .from("call_logs")
        .select("id,called_at,status,notes,telecaller_id,lead_id,leads(customer_name,phone_number,policy_type,areas(name))")
        .gte("called_at", since)
        .order("called_at", { ascending: false })
        .limit(2000);
      if (!mounted) return;
      const raw = (data ?? []) as any[];
      const tcIds = Array.from(new Set(raw.map((r) => r.telecaller_id).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (tcIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", tcIds);
        nameMap = Object.fromEntries(((profs ?? []) as any[]).map((p) => [p.id, p.full_name ?? "—"]));
      }
      const mapped: Row[] = raw.map((r) => ({
        id: r.id,
        called_at: r.called_at,
        status: r.status,
        notes: r.notes,
        telecaller_name: nameMap[r.telecaller_id] ?? "—",
        customer_name: r.leads?.customer_name ?? "—",
        phone: r.leads?.phone_number ?? "—",
        area: r.leads?.areas?.name ?? "—",
        policy_type: r.leads?.policy_type ?? "—",
      }));
      setRows(mapped);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [range]);

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);
  const tcs = useMemo(() => Array.from(new Set(rows.map((r) => r.telecaller_name))).sort(), [rows]);
  const areas = useMemo(() => Array.from(new Set(rows.map((r) => r.area))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (tcFilter !== "all" && r.telecaller_name !== tcFilter) return false;
    if (areaFilter !== "all" && r.area !== areaFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!r.customer_name.toLowerCase().includes(s) && !r.phone.includes(q) && !(r.notes ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rows, statusFilter, tcFilter, areaFilter, q]);

  const summary = useMemo(() => ({
    total: filtered.length,
    interested: filtered.filter((r) => r.status === "Interested").length,
    converted: filtered.filter((r) => r.status === "Converted").length,
    notPicked: filtered.filter((r) => r.status === "Not Picked").length,
  }), [filtered]);

  const exportCSV = () => {
    const headers = ["Time", "Telecaller", "Customer", "Phone", "Policy", "Area", "Status", "Notes"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push([
        new Date(r.called_at).toLocaleString(),
        r.telecaller_name, r.customer_name, r.phone, r.policy_type, r.area, r.status,
        (r.notes ?? "").replace(/[\r\n,]/g, " "),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `call-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Call Reports</h1>
          <p className="text-sm text-muted-foreground">Sabhi calling activity ek jagah — filter, search aur export</p>
        </div>
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {(["today", "7d", "30d", "all"] as const).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "hero" : "ghost"} onClick={() => setRange(r)} className="h-8 rounded-full px-3 text-xs">
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "Total Calls", value: summary.total, accent: "border-l-primary" },
          { label: "Interested", value: summary.interested, accent: "border-l-success" },
          { label: "Converted", value: summary.converted, accent: "border-l-accent" },
          { label: "Not Picked", value: summary.notPicked, accent: "border-l-destructive" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border border-l-[3px] ${s.accent} bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">{s.label}</div>
            <div className="text-xl font-extrabold tabular-nums">{s.value.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base mr-auto">Calls ({filtered.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 w-48 pl-8" placeholder="Name / phone / note" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tcFilter} onValueChange={setTcFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Telecaller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All telecallers</SelectItem>
                {tcs.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Telecaller</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No calls match the filters.</TableCell></TableRow>
                ) : filtered.slice(0, 500).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.called_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium">{r.telecaller_name}</TableCell>
                    <TableCell className="text-sm">{r.customer_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                    <TableCell><Badge variant="outline">{r.policy_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.area}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] ?? "bg-muted"}>{r.status}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.notes ?? ""}>{r.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 500 && (
            <div className="border-t p-2 text-center text-xs text-muted-foreground">Showing first 500 of {filtered.length}. Export CSV for full list.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
