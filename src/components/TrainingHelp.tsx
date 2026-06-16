import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, FileText, ExternalLink } from "lucide-react";

type Material = {
  id: string; title: string; description: string | null;
  content_type: string; url: string | null; body: string | null;
};

const youtubeEmbed = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

/**
 * Small help/training icon button that opens a dialog with training materials
 * filtered by module_key. Super admin / admin can add materials in the Training module
 * tagged with that module_key, and they auto-appear here.
 */
export const TrainingHelp = ({ moduleKey, label }: { moduleKey: string; label?: string }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Material[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count } = await supabase
        .from("training_materials")
        .select("id,title,description,content_type,url,body", { count: "exact" })
        .eq("module_key", moduleKey)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (!active) return;
      setItems((data as any) ?? []);
      setCount(count ?? (data?.length ?? 0));
    })();
    return () => { active = false; };
  }, [moduleKey, open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
        title={`Training & help${label ? ` — ${label}` : ""}`}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Help</span>
        {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{count}</Badge>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Training & Help {label ? `— ${label}` : ""}
            </DialogTitle>
          </DialogHeader>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Abhi tak iss module ke liye training material add nahi hua hai. Admin → Training Module se add karein.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((m) => (
                <div key={m.id} className="space-y-2 rounded-lg border p-3">
                  <div className="font-semibold">{m.title}</div>
                  {m.description && <div className="text-sm text-muted-foreground">{m.description}</div>}
                  {m.content_type === "youtube" && m.url && youtubeEmbed(m.url) && (
                    <div className="aspect-video w-full overflow-hidden rounded-md border">
                      <iframe src={youtubeEmbed(m.url)!} className="h-full w-full" allowFullScreen />
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
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
