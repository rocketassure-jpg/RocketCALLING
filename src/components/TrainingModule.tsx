import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Plus, Trash2, FileText, Video, Image as ImageIcon, ExternalLink } from "lucide-react";

type Material = {
  id: string; title: string; description: string | null;
  category: string; content_type: string; url: string | null; body: string | null;
  sort_order: number; created_at: string;
};

const youtubeEmbed = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

export const TrainingModule = ({ canManage = false }: { canManage?: boolean }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Material[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "video", content_type: "youtube", url: "", body: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("training_materials").select("*").order("sort_order").order("created_at", { ascending: false });
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title) return toast({ title: "Title required", variant: "destructive" });
    if ((form.content_type === "youtube" || form.content_type === "pdf" || form.content_type === "image") && !form.url) {
      return toast({ title: "URL required for this type", variant: "destructive" });
    }
    if (form.content_type === "note" && !form.body) return toast({ title: "Note body required", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("training_materials").insert({ ...form, created_by: user!.id });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Training material added ✅" });
    setForm({ title: "", description: "", category: "video", content_type: "youtube", url: "", body: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("training_materials").delete().eq("id", id);
    load();
  };

  const grouped = {
    text: items.filter((i) => i.category === "text"),
    video: items.filter((i) => i.category === "video"),
    image: items.filter((i) => i.category === "image"),
  };

  const renderItem = (m: Material) => (
    <Card key={m.id} className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold">{m.title}</div>
            {m.description && <div className="text-sm text-muted-foreground">{m.description}</div>}
          </div>
          {canManage && (
            <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          )}
        </div>
        {m.content_type === "youtube" && m.url && youtubeEmbed(m.url) && (
          <div className="aspect-video w-full overflow-hidden rounded-md border">
            <iframe src={youtubeEmbed(m.url)!} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
        {m.content_type === "image" && m.url && (
          <img src={m.url} alt={m.title} className="w-full rounded-md border" loading="lazy" />
        )}
        {m.content_type === "pdf" && m.url && (
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <FileText className="h-4 w-4" /> Open PDF <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {m.content_type === "note" && m.body && (
          <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{m.body}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Training Module</h2>
      </div>

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add training material</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Notes</SelectItem>
                  <SelectItem value="video">Video Tutorials</SelectItem>
                  <SelectItem value="image">Image Guides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Content type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube link</SelectItem>
                  <SelectItem value="pdf">PDF link</SelectItem>
                  <SelectItem value="image">Image URL</SelectItem>
                  <SelectItem value="note">Text note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {form.content_type !== "note" ? (
              <div className="space-y-2 md:col-span-2"><Label>URL</Label><Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
            ) : (
              <div className="space-y-2 md:col-span-2"><Label>Note body</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            )}
            <div className="md:col-span-2">
              <Button variant="hero" onClick={add} disabled={saving}><Plus className="h-4 w-4" /> Add Material</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={["video", "text", "image"]}>
        <AccordionItem value="video">
          <AccordionTrigger><div className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Video Tutorials <Badge variant="secondary" className="ml-2">{grouped.video.length}</Badge></div></AccordionTrigger>
          <AccordionContent>
            {grouped.video.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No videos yet.</p> : <div className="grid gap-3 md:grid-cols-2">{grouped.video.map(renderItem)}</div>}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="text">
          <AccordionTrigger><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Text Notes <Badge variant="secondary" className="ml-2">{grouped.text.length}</Badge></div></AccordionTrigger>
          <AccordionContent>
            {grouped.text.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No notes yet.</p> : <div className="grid gap-3 md:grid-cols-2">{grouped.text.map(renderItem)}</div>}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="image">
          <AccordionTrigger><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Image Guides <Badge variant="secondary" className="ml-2">{grouped.image.length}</Badge></div></AccordionTrigger>
          <AccordionContent>
            {grouped.image.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No images yet.</p> : <div className="grid gap-3 md:grid-cols-2">{grouped.image.map(renderItem)}</div>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
