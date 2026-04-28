import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquarePlus, Phone, StickyNote } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type TimelineEntry = {
  id: string;
  kind: "call" | "note";
  text: string;
  at: string;
};

export const LeadTimeline = ({ leadId }: { leadId: string }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [calls, notes] = await Promise.all([
      supabase.from("call_logs").select("id,status,called_at").eq("lead_id", leadId).order("called_at", { ascending: false }).limit(50),
      supabase.from("lead_notes").select("id,note,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    ]);
    const merged: TimelineEntry[] = [
      ...(calls.data ?? []).map((c: any) => ({ id: `c-${c.id}`, kind: "call" as const, text: `Call → ${c.status}`, at: c.called_at })),
      ...(notes.data ?? []).map((n: any) => ({ id: `n-${n.id}`, kind: "note" as const, text: n.note, at: n.created_at })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId]);

  const addNote = async () => {
    if (!note.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("lead_notes").insert({ lead_id: leadId, author_id: user.id, note: note.trim() });
    setSaving(false);
    if (error) return toast({ title: "Note save fail", description: error.message, variant: "destructive" });
    setNote("");
    toast({ title: "Note saved" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pichli baat-cheet ka note add karo…" rows={2} />
        <Button size="sm" onClick={addNote} disabled={saving || !note.trim()}>
          <MessageSquarePlus className="h-4 w-4" /> Add
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-2">Koi history nahi.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id} className="flex gap-2 rounded-md border bg-muted/30 p-2 text-sm">
              {it.kind === "call" ? <Phone className="mt-0.5 h-4 w-4 text-primary" /> : <StickyNote className="mt-0.5 h-4 w-4 text-warning" />}
              <div className="flex-1 min-w-0">
                <div className="break-words">{it.text}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(it.at).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
