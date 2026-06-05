import { Home, Users, Menu } from "lucide-react";

type Tab = "home" | "leads" | "menu";

export const MobileBottomNav = ({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) => {
  const Btn = ({ id, label, Icon }: { id: Tab; label: string; Icon: any }) => (
    <button
      onClick={() => onChange(id)}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
        active === id ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-elegant md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <Btn id="home" label="Home" Icon={Home} />
        <Btn id="leads" label="Leads" Icon={Users} />
        <Btn id="menu" label="Menu" Icon={Menu} />
      </div>
    </nav>
  );
};
