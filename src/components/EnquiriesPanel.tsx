import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Check, Loader2, Inbox } from "lucide-react";

type Enquiry = {
  id: string;
  customer_name: string;
  phone_number: string;
  vehicle_number: string | null;
  insurance_type: "Life" | "Health" | "Motor";
  message: string | null;
  handled: boolean;
  created_at: string;
};

export const EnquiriesPanel = () => {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markHandled = async (id: string) => {
    const { error } = await supabase.from("enquiries").update({ handled: true }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, handled: true } : x)));
  };

  const newCount = items.filter((x) => !x.handled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Customer enquiries
          {newCount > 0 && <Badge className="bg-primary text-primary-foreground">{newCount} new</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No enquiries yet.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id} className={e.handled ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    {e.customer_name}
                    {!e.handled && <Badge className="ml-2 bg-primary text-primary-foreground">NEW</Badge>}
                  </TableCell>
                  <TableCell>{e.phone_number}</TableCell>
                  <TableCell>{e.vehicle_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{e.insurance_type}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{e.message || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="hero">
                        <a href={`tel:${e.phone_number}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                      <Button asChild size="sm" variant="success">
                        <a href={`https://wa.me/${e.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                      {!e.handled && (
                        <Button size="sm" variant="outline" onClick={() => markHandled(e.id)}>
                          <Check className="h-4 w-4" /> Done
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
