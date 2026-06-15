import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Ban, RotateCcw, Trash2, Loader2 } from "lucide-react";

type Row = { id: string; customer_name: string; phone_number: string; policy_type: string; areas?: { name: string } | null };

export const TrashPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("id,customer_name,phone_number,policy_type,areas(name)")
      .eq("status", "Unsubscribed")
      .order("updated_at", { ascending: false });
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const restore = async (id: string) => {
    const { error } = await supabase.from("leads").update({ status: "New" }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Restored" }); load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> Do Not Call (Trash)</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No unsubscribed leads.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Area</TableHead><TableHead>Policy</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.customer_name}</TableCell>
                <TableCell>{l.phone_number}</TableCell>
                <TableCell>{l.areas?.name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{l.policy_type}</Badge></TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => restore(l.id)}><RotateCcw className="h-4 w-4" /> Restore</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
