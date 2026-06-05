import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit3, Trash2, FileText, Users2, User as UserIcon, Loader2 } from "lucide-react";

export const TEMPLATE_VARIABLES = ["{name}", "{vehicle}", "{policy_date}", "{agent_name}"];
const CATEGORIES = ["Thanks", "Follow-up", "Quote", "Reminder", "Custom"];

export type MessageTemplate = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: string;
  shared: boolean;
};

export const fillTemplate = (
  body: string,
  vars: { name?: string; vehicle?: string; policy_date?: string; agent_name?: string }
) =>
  body
    .replace(/\{name\}/g, vars.name ?? "")
    .replace(/\{vehicle\}/g, vars.vehicle ?? "")
    .replace(/\{policy_date\}/g, vars.policy_date ?? "")
    .replace(/\{agent_name\}/g, vars.agent_name ?? "");

export const TemplatesManager = ({ canShare }: { canShare: boolean }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({
      id: "",
      owner_id: user?.id ?? "",
      title: "",
      body: "Namaste {name}, Rocket Services se {agent_name}. ",
      category: "Custom",
      shared: false,
    });
    setOpen(true);
  };

  const openEdit = (t: MessageTemplate) => { setEditing(t); setOpen(true); };

  const save = async () => {
    if (!editing || !user) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      return toast({ title: "Title and message required", variant: "destructive" });
    }
    const payload = {
      title: editing.title.trim(),
      body: editing.body,
      category: editing.category,
      shared: canShare ? editing.shared : false,
    };
    const { error } = editing.id
      ? await supabase.from("message_templates").update(payload).eq("id", editing.id)
      : await supabase.from("message_templates").insert({ ...payload, owner_id: user.id });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Template updated" : "Template added" });
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const insertVar = (v: string) => {
    if (!editing) return;
    setEditing({ ...editing, body: editing.body + " " + v });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Message Templates</CardTitle>
        <Button size="sm" variant="hero" onClick={openNew}><Plus className="h-4 w-4" /> Add</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Koi template nahi hai. Add karke shuru karo.</p>
        ) : items.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold">{t.title}</span>
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                {t.shared ? (
                  <Badge className="bg-accent text-accent-foreground text-[10px]"><Users2 className="h-2.5 w-2.5" /> Team</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]"><UserIcon className="h-2.5 w-2.5" /> Personal</Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
            </div>
            <div className="flex gap-1">
              {(t.owner_id === user?.id || canShare) && (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{t.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(t.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Thank you message" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {canShare && (
                  <div className="flex items-end gap-2">
                    <div className="flex h-10 w-full items-center justify-between rounded-md border px-3">
                      <Label className="text-sm"><Users2 className="mr-1 inline h-3.5 w-3.5" /> Team-wide</Label>
                      <Switch checked={editing.shared} onCheckedChange={(v) => setEditing({ ...editing, shared: v })} />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Message body</Label>
                <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={5} />
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <Button key={v} type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => insertVar(v)}>{v}</Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
