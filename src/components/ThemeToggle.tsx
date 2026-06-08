import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const { theme, setTheme, resolved } = useTheme();

  if (compact) {
    return (
      <button
        onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted"
        aria-label="Toggle theme"
      >
        {resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-card p-1">
      {([
        { id: "light", icon: Sun, label: "Light" },
        { id: "dark", icon: Moon, label: "Dark" },
        { id: "system", icon: Monitor, label: "Auto" },
      ] as const).map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {opt.label}
          </button>
        );
      })}
    </div>
  );
};
