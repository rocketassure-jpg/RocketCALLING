import { useState } from "react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RevivalRange = { from: string; to: string; label: string } | null;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const RevivalDateFilter = ({
  value, onChange,
}: { value: RevivalRange; onChange: (v: RevivalRange) => void }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | undefined>(
    value && value.from === value.to ? new Date(value.from) : undefined
  );

  const today = new Date();
  const set = (preset: "today" | "tomorrow" | "week") => {
    if (preset === "today") {
      const d = iso(today);
      onChange({ from: d, to: d, label: "Today" });
    } else if (preset === "tomorrow") {
      const d = iso(addDays(today, 1));
      onChange({ from: d, to: d, label: "Tomorrow" });
    } else {
      onChange({
        from: iso(startOfWeek(today, { weekStartsOn: 1 })),
        to: iso(endOfWeek(today, { weekStartsOn: 1 })),
        label: "This Week",
      });
    }
  };

  const active = (label: string) => value?.label === label;
  const chip = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors",
        active(label)
          ? "border-warning bg-warning text-warning-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border bg-card p-3 shadow-card-pop">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarIcon className="h-4 w-4 text-warning" />
          Revival Date Filter
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setPickedDate(undefined); }}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chip("Today", () => set("today"))}
        {chip("Tomorrow", () => set("tomorrow"))}
        {chip("This Week", () => set("week"))}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "min-h-[36px] rounded-full px-3 text-xs font-semibold",
                value && value.from === value.to && !["Today", "Tomorrow", "This Week"].includes(value.label)
                  ? "border-warning bg-warning text-warning-foreground hover:bg-warning"
                  : ""
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {pickedDate ? format(pickedDate, "dd MMM yyyy") : "Custom Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={pickedDate}
              onSelect={(d) => {
                if (!d) return;
                setPickedDate(d);
                const s = iso(d);
                onChange({ from: s, to: s, label: format(d, "dd MMM yyyy") });
                setPickerOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      {value && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Highlighted leads: policy expiring on <span className="font-semibold text-warning">{value.label}</span>
          {value.from !== value.to ? ` (${value.from} → ${value.to})` : ""}
        </p>
      )}
    </div>
  );
};
