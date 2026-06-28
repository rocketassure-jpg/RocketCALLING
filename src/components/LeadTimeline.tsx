import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, StickyNote, User } from "lucide-react";

type TimelineEntry = {
  id: string;
  kind: "call" | "note" | "customer_note";
  text: string;
  at: string;
};

export const LeadTimeline = ({ leadId, customerId }: { leadId: string; customerId?: string | null }) => {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const queries: Promise<any>[] = [
      supabase.from("call_logs").select("id,status,called_at").eq("lead_id", leadId).order("called_at", { ascending: false }).limit(50),
      supabase.from("lead_notes").select("id,note,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    ];
    let cid = customerId;
    if (!cid) {
      const { data: l } = await supabase.from("leads").select("customer_id").eq("id", leadId).maybeSingle();
      cid = (l as any)?.customer_id ?? null;
    }
    if (cid) {
      queries.push(
        supabase.from("customer_notes").select("id,note,created_at").eq("customer_id", cid).order("created_at", { ascending: false }).limit(50),
      );
    }
    const results = await Promise.all(queries);
    const [calls, notes, cnotes] = results;
    const merged: TimelineEntry[] = [
      ...((calls.data ?? []) as any[]).map((c: any) => ({ id: `c-${c.id}`, kind: "call" as const, text: `Call → ${c.status}`, at: c.called_at })),
      ...((notes.data ?? []) as any[]).map((n: any) => ({ id: `n-${n.id}`, kind: "note" as const, text: n.note, at: n.created_at })),
      ...(((cnotes?.data ?? []) as any[])).map((n: any) => ({ id: `cn-${n.id}`, kind: "customer_note" as const, text: n.note, at: n.created_at })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [leadId, customerId]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-2">Koi history nahi.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id} className="flex gap-2 rounded-md border bg-muted/30 p-2 text-sm">
              {it.kind === "call" ? <Phone className="mt-0.5 h-4 w-4 text-primary" />
                : it.kind === "customer_note" ? <User className="mt-0.5 h-4 w-4 text-accent" />
                : <StickyNote className="mt-0.5 h-4 w-4 text-warning" />}
              <div className="flex-1 min-w-0">
                <div className="break-words">
                  {it.text}
                  {it.kind === "customer_note" && <span className="ml-1 text-[10px] text-muted-foreground">(Customer Note)</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(it.at).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
