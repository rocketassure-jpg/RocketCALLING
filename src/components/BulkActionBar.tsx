import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, X } from "lucide-react";

const SECTIONS = ["New", "Interested", "Follow-up", "Done", "Unsubscribed"];

export const BulkActionBar = ({
  count,
  telecallers,
  onClear,
  onDelete,
  onMove,
  onAssign,
}: {
  count: number;
  telecallers: { id: string; full_name: string }[];
  onClear: () => void;
  onDelete: () => void | Promise<void>;
  onMove: (status: string) => void | Promise<void>;
  onAssign: (telecallerId: string) => void | Promise<void>;
}) => {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-2 bottom-2 z-40 mx-auto max-w-3xl rounded-2xl border bg-background/95 p-3 shadow-elegant backdrop-blur md:bottom-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{count} selected</span>
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear"><X className="h-4 w-4" /></Button>
        <div className="flex-1" />
        <Select onValueChange={onMove}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Move to…" /></SelectTrigger>
          <SelectContent>{SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select onValueChange={onAssign}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign telecaller…" /></SelectTrigger>
          <SelectContent>{telecallers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</SelectItem>)}</SelectContent>
        </Select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {count} leads?</AlertDialogTitle>
              <AlertDialogDescription>Yeh action permanent hai. Selected leads database se delete ho jayenge.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
