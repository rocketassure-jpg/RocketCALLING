import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type MenuItem = { id: string; label: string; icon?: any };

export const HamburgerMenu = ({
  items,
  active,
  onChange,
  userName,
}: {
  items: MenuItem[];
  active?: string;
  onChange: (id: string) => void;
  userName?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <div className="flex h-16 items-center border-b px-4"><Logo /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((it) => {
            const isActive = active === it.id;
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                onClick={() => { onChange(it.id); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />} {it.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1 text-xs text-muted-foreground truncate">{userName || user?.email}</div>
          <Button variant="destructive" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
