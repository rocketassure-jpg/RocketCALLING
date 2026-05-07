import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Send, Smartphone, QrCode, Loader2 } from "lucide-react";

const BRIDGE_URL =
  (import.meta.env.VITE_BRIDGE_URL as string) ||
  "https://repository-name-rocket-whatsapp-bridge-production.up.railway.app";
const BRIDGE_API_KEY =
  (import.meta.env.VITE_BRIDGE_API_KEY as string) || "rocket-bridge-2024-secret";

const headers = { "x-api-key": BRIDGE_API_KEY, "Content-Type": "application/json" };

type Lead = { id: string; customer_name: string; phone_number: string };

export const WhatsAppBulkMessaging = () => {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected" | "error">("loading");
  const [statusMsg, setStatusMsg] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("Namaste {name}, aapki policy ke baare mein ek update hai.");
  const [sending, setSending] = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${BRIDGE_URL}/status`, { headers });
      const j = await r.json().catch(() => ({}));
      const connected = j.connected || j.status === "connected" || j.ready === true;
      setStatus(connected ? "connected" : "disconnected");
      setStatusMsg(j.message || j.status || (connected ? "Connected" : "Not connected"));
      if (!connected) fetchQR();
      else setQr(null);
    } catch (e: any) {
      setStatus("error");
      setStatusMsg(e?.message || "Bridge reachable nahi hai");
    }
  };

  const fetchQR = async () => {
    try {
      const r = await fetch(`${BRIDGE_URL}/qr`, { headers });
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await r.json();
        setQr(j.qr || j.qrCode || j.dataUrl || null);
      } else if (ct.includes("image")) {
        const blob = await r.blob();
        setQr(URL.createObjectURL(blob));
      } else {
        const txt = await r.text();
        setQr(txt.startsWith("data:") ? txt : null);
      }
    } catch {
      setQr(null);
    }
  };

  const loadLeads = async () => {
    const { data } = await supabase.from("leads").select("id, customer_name, phone_number").limit(1000);
    setLeads(data || []);
  };

  useEffect(() => {
    fetchStatus();
    loadLeads();
    const t = setInterval(fetchStatus, 8000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => !q || l.customer_name?.toLowerCase().includes(q) || l.phone_number?.includes(q));
  }, [leads, search]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = (v: boolean) => {
    const n = new Set(selected);
    filtered.forEach((l) => (v ? n.add(l.id) : n.delete(l.id)));
    setSelected(n);
  };

  const sendBulk = async () => {
    const targets = leads.filter((l) => selected.has(l.id));
    if (!targets.length) return toast({ title: "Koi lead select nahi", variant: "destructive" });
    if (!message.trim()) return toast({ title: "Message likho pehle", variant: "destructive" });
    if (status !== "connected") return toast({ title: "WhatsApp connect nahi hai", variant: "destructive" });

    setSending(true);
    let ok = 0, fail = 0;
    for (const l of targets) {
      const text = message.replace(/\{name\}/gi, l.customer_name || "");
      const phone = (l.phone_number || "").replace(/\D/g, "");
      try {
        const r = await fetch(`${BRIDGE_URL}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({ phone, number: phone, message: text, text }),
        });
        if (r.ok) ok++; else fail++;
      } catch {
        fail++;
      }
      await new Promise((res) => setTimeout(res, 500));
    }
    setSending(false);
    toast({ title: `Bhej diya: ${ok} ✓ / ${fail} ✗`, description: `${targets.length} contacts processed` });
    setSelected(new Set());
  };

  const statusColor =
    status === "connected" ? "bg-success text-success-foreground"
    : status === "disconnected" ? "bg-warning text-warning-foreground"
    : status === "error" ? "bg-destructive text-destructive-foreground"
    : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Smartphone className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">WhatsApp Bulk Messaging</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Bridge Status</span>
              <Badge className={statusColor}>{status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground break-all">{BRIDGE_URL}</p>
            <p>{statusMsg}</p>
            <Button size="sm" variant="outline" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4" /> QR Login
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2">
            {status === "connected" ? (
              <p className="text-sm text-success">✓ WhatsApp connected</p>
            ) : qr ? (
              qr.startsWith("data:image") || qr.startsWith("blob:") || qr.startsWith("http") ? (
                <img src={qr} alt="QR" className="h-48 w-48 rounded border bg-white p-2" />
              ) : (
                <pre className="overflow-auto whitespace-pre rounded border bg-white p-2 text-[6px] leading-[6px] text-black">{qr}</pre>
              )
            ) : (
              <div className="flex h-48 w-48 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <Button size="sm" variant="outline" onClick={fetchQR}>
              <RefreshCw className="h-4 w-4" /> Reload QR
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Message Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Tip: <code className="rounded bg-muted px-1">{"{name}"}</code> use karo to personalize karne ke liye.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Select Contacts ({selected.size}/{filtered.length})</CardTitle>
            <Input className="max-w-xs" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 border-b pb-2">
            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
            <span className="text-sm font-medium">Select All (filtered)</span>
          </div>
          <div className="max-h-80 space-y-1 overflow-auto">
            {filtered.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted">
                <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{l.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{l.phone_number}</div>
                </div>
              </label>
            ))}
            {!filtered.length && <p className="p-4 text-center text-sm text-muted-foreground">Koi lead nahi mila</p>}
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-2 bottom-2 z-40 mx-auto max-w-3xl rounded-2xl border bg-background/95 p-3 shadow-elegant backdrop-blur md:bottom-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="flex-1" />
          <Button onClick={sendBulk} disabled={sending || !selected.size || status !== "connected"}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Bulk
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBulkMessaging;
