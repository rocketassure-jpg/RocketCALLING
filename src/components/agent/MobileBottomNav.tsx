import { Home, Users, Phone, Menu } from "lucide-react";

type Tab = "home" | "leads" | "menu";

export const MobileBottomNav = ({ active, onChange, onCallClick }: { active: Tab; onChange: (t: Tab) => void; onCallClick: () => void }) => {
  const Btn = ({ id, label, Icon }: { id: Tab; label: string; Icon: any }) => (
    <button
      onClick={() => onChange(id)}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${active === id ? "text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-elegant md:hidden">
      <div className="relative mx-auto flex max-w-md items-center justify-around">
        <Btn id="home" label="Home" Icon={Home} />
        <Btn id="leads" label="Leads" Icon={Users} />
        <div className="w-16" />
        <Btn id="menu" label="Menu" Icon={Menu} />
        <button
          onClick={onCallClick}
          className="absolute -top-6 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow active:scale-95"
          aria-label="Start calling"
        >
          <Phone className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
};
