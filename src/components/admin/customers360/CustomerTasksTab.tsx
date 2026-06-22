import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, CheckCircle2, ListTodo } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type T = { id: string; title: string; description: string | null; task_type: string; due_at: string | null; status: string; priority: string };

export const CustomerTasksTab = ({ customerId }: { customerId: string }) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", task_type: "followup", due_at: "", priority: "medium" });

  const load = async () => {
    const { data } = await (supabase as any).from("customer_tasks").select("*").eq("customer_id", customerId).order("due_at", { ascending: true, nullsFirst: false });
    setRows((data ?? []) as T[]);
  };
  useEffect(() => { load(); }, [customerId]);

  const save = async () => {
    if (!form.title.trim() || !companyId) return toast({ title: "Title required", variant: "destructive" });
    const { error } = await (supabase as any).from("customer_tasks").insert({
      company_id: companyId, customer_id: customerId, created_by: user?.id ?? null, assigned_to: user?.id ?? null,
      title: form.title.trim(), description: form.description || null, task_type: form.task_type,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null, priority: form.priority, status: "open",
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Task added" });
    setOpen(false); setForm({ title: "", description: "", task_type: "followup", due_at: "", priority: "medium" });
    load();
  };

  const complete = async (id: string) => {
    await (supabase as any).from("customer_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    await (supabase as any).from("customer_tasks").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground"><ListTodo className="inline h-4 w-4 mr-1" /> {rows.filter(r => r.status === "open").length} open / {rows.length} total</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
      </div>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet.</p>}
      <div className="space-y-2">
        {rows.map((t) => (
          <Card key={t.id}><CardContent className="p-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                <Badge variant="outline" className="text-xs">{t.task_type}</Badge>
                <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="text-xs">{t.priority}</Badge>
                {t.status === "done" && <Badge className="text-xs">Done</Badge>}
              </div>
              {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
              {t.due_at && <p className="text-xs text-muted-foreground">Due: {new Date(t.due_at).toLocaleString()}</p>}
            </div>
            <div className="flex gap-1">
              {t.status !== "done" && <Button size="sm" variant="outline" onClick={() => complete(t.id)}><CheckCircle2 className="h-3 w-3" /></Button>}
              <Button size="sm" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add task</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["followup","call","document","payment","renewal","claim","other"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due</Label><Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
