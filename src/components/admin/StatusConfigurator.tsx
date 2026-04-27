import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Status = { id: string; name: string; bucket: string; color: string; sort_order: number };

const BUCKETS = ["Hot", "Cold", "Won", "Lost"] as const;
const BUCKET_COLOR: Record<string, string> = { Hot: "#ef4444", Cold: "#3b82f6", Won: "#22c55e", Lost: "#64748b" };

const SortableRow = ({ s, onDelete }: { s: Status; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag to reorder">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
      <div className="flex-1 font-medium">{s.name}</div>
      <Badge variant="outline">{s.bucket}</Badge>
      <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
};

export const StatusConfigurator = () => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<typeof BUCKETS[number]>("Hot");

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = () => supabase.from("lead_statuses").select("*").order("sort_order").then(({ data }) => setStatuses((data as any) ?? []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("lead_statuses").insert({ name: name.trim(), bucket, color: BUCKET_COLOR[bucket], sort_order: statuses.length });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setName(""); load();
  };

  const del = async (id: string) => { await supabase.from("lead_statuses").delete().eq("id", id); load(); };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = statuses.findIndex((s) => s.id === active.id);
    const newIdx = statuses.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(statuses, oldIdx, newIdx);
    setStatuses(reordered);
    // persist new sort_order
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("lead_statuses").update({ sort_order: i }).eq("id", reordered[i].id);
    }
    toast({ title: "Order saved" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Status Configurator</h1>
        <p className="text-sm text-muted-foreground">Drag to reorder. Statuses appear in agent disposition modal.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add new status</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Status name (e.g. Hot Followup)" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUCKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="hero" onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Statuses ({statuses.length})</CardTitle></CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {statuses.map((s) => <SortableRow key={s.id} s={s} onDelete={del} />)}
              </div>
            </SortableContext>
          </DndContext>
          {!statuses.length && <p className="py-8 text-center text-sm text-muted-foreground">No statuses yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};
