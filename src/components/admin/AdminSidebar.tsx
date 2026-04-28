import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Phone, Inbox, MapPin, Upload, Ban, Shield, Settings, ListChecks, Tags, KeyRound, Webhook } from "lucide-react";
import { Logo } from "@/components/Logo";

const items = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "calling", label: "Calling", icon: Phone },
  { to: "enquiries", label: "Enquiries", icon: Inbox },
  { to: "leads", label: "Customers", icon: Users },
  { to: "import", label: "CSV Import", icon: Upload },
  { to: "smart-import", label: "Smart Import", icon: Upload },
  { to: "api", label: "API & Webhooks", icon: Webhook },
  { to: "areas", label: "Areas", icon: MapPin },
  { to: "team", label: "Team", icon: Shield },
  { to: "settings", label: "General", icon: Settings },
  { to: "permissions", label: "Permissions", icon: KeyRound },
  { to: "fields", label: "CRM Fields", icon: Tags },
  { to: "statuses", label: "Statuses", icon: ListChecks },
  { to: "trash", label: "Trash (DNC)", icon: Ban },
];

export const AdminSidebar = ({ active, onChange }: { active: string; onChange: (v: string) => void }) => (
  <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
    <div className="flex h-16 items-center border-b px-4"><Logo /></div>
    <nav className="flex-1 space-y-1 p-3">
      {items.map((it) => {
        const Active = active === it.to;
        return (
          <button
            key={it.to}
            onClick={() => onChange(it.to)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              Active ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <it.icon className="h-4 w-4" /> {it.label}
          </button>
        );
      })}
    </nav>
    <div className="border-t p-3 text-xs text-muted-foreground">Rocket CRM • Owner</div>
  </aside>
);
