import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Info, AlertTriangle, CheckCircle, OctagonAlert } from "lucide-react";

const ICON: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle, critical: OctagonAlert };

export const AnnouncementsBanner = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ann_dismissed") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("announcements").select("*").lte("show_from", new Date().toISOString()).order("created_at", { ascending: false }).limit(5);
      const now = Date.now();
      setRows((data ?? []).filter((a: any) => !a.show_until || new Date(a.show_until).getTime() >= now));
    })();
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id); setDismissed(next);
    localStorage.setItem("ann_dismissed", JSON.stringify([...next]));
  };

  const visible = rows.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 px-3 pt-3">
      {visible.map((a) => {
        const Icon = ICON[a.type] || Info;
        const variant = a.type === "critical" ? "destructive" : "default";
        return (
          <Alert key={a.id} variant={variant as any} className="relative pr-10">
            <Icon className="h-4 w-4" />
            <AlertTitle>{a.title}</AlertTitle>
            <AlertDescription>{a.message}</AlertDescription>
            {a.is_dismissible && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => dismiss(a.id)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </Alert>
        );
      })}
    </div>
  );
};
