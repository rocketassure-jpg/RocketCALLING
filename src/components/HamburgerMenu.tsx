import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type MenuItem = {
  id: string;
  label: string;
  icon?: any;
  group?: string;
  badge?: number;
  subText?: ReactNode;
};

export const HamburgerMenu = ({
  items,
  active,
  onChange,
  userName,
  topSlot,
  collapsibleGroups = [],
}: {
  items: MenuItem[];
  active?: string;
  onChange: (id: string) => void;
  userName?: ReactNode;
  topSlot?: ReactNode;
  collapsibleGroups?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const { signOut, user } = useAuth();

  const toggleGroup = (g: string) =>
    setOpenGroups((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });

  const renderItem = (it: MenuItem) => {
    const isActive = active === it.id;
    const Icon = it.icon;
    return (
      <button
        key={it.id}
        onClick={() => { onChange(it.id); setOpen(false); }}
        className={`flex min-h-[30px] w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          isActive ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate">{it.label}</div>
          {it.subText && <div className="truncate text-[10px] opacity-70">{it.subText}</div>}
        </div>
        {typeof it.badge === "number" && it.badge > 0 && (
          <span className="ml-auto rounded-full bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 font-semibold">{it.badge}</span>
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <div className="flex h-16 items-center border-b px-4"><Logo /></div>
        {topSlot && <div className="border-b p-3">{topSlot}</div>}
        <div className="border-b p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Appearance</div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {(() => {
            const groups: Record<string, MenuItem[]> = {};
            const order: string[] = [];
            items.forEach((it) => {
              const g = it.group || "General";
              if (!groups[g]) { groups[g] = []; order.push(g); }
              groups[g].push(it);
            });
            return order.map((gName) => {
              const gItems = groups[gName];
              const collapsible = collapsibleGroups.includes(gName);
              const isOpen = openGroups.has(gName);
              if (collapsible) {
                return (
                  <div key={gName} className="space-y-0.5">
                    <button
                      onClick={() => toggleGroup(gName)}
                      className="flex w-full items-center gap-1 px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {gName}
                    </button>
                    {isOpen && gItems.map(renderItem)}
                  </div>
                );
              }
              return (
                <div key={gName} className="space-y-0.5">
                  <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{gName}</div>
                  {gItems.map(renderItem)}
                </div>
              );
            });
          })()}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1 text-xs text-muted-foreground truncate">{userName || user?.email}</div>
          <Button variant="destructive" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
