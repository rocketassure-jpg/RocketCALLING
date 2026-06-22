import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pin, Trash2, StickyNote } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type N = { id: string; note: string; pinned: boolean; created_at: string };

export const CustomerNotesTab = ({ customerId }: { customerId: string }) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<N[]>([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await (supabase as any).from("customer_notes").select("*").eq("customer_id", customerId).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setRows((data ?? []) as N[]);
  };
  useEffect(() => { load(); }, [customerId]);

  const add = async () => {
    if (!text.trim() || !companyId) return;
    const { error } = await (supabase as any).from("customer_notes").insert({
      company_id: companyId, customer_id: customerId, note: text.trim(), created_by: user?.id ?? null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setText(""); load();
  };

  const togglePin = async (n: N) => { await (supabase as any).from("customer_notes").update({ pinned: !n.pinned }).eq("id", n.id); load(); };
  const del = async (id: string) => { await (supabase as any).from("customer_notes").delete().eq("id", id); load(); };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea placeholder="Add a note about this customer…" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" onClick={add} disabled={!text.trim()}><StickyNote className="h-4 w-4 mr-1" /> Save Note</Button>
      </div>
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No notes yet.</p>}
      <div className="space-y-2">
        {rows.map((n) => (
          <Card key={n.id}><CardContent className="p-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              {n.pinned && <Badge className="mb-1 text-xs"><Pin className="h-3 w-3 mr-1" /> Pinned</Badge>}
              <p className="text-sm whitespace-pre-wrap">{n.note}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => togglePin(n)}><Pin className={`h-3 w-3 ${n.pinned ? "text-primary" : ""}`} /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(n.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
};
