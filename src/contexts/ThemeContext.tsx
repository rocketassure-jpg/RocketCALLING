import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ThemeMode = "light" | "dark" | "system";

type Ctx = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
};

const ThemeCtx = createContext<Ctx>({} as Ctx);

const STORAGE_KEY = "ui_theme";

const systemPref = (): "light" | "dark" =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyClass = (mode: "light" | "dark") => {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system"
  );
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Apply theme whenever it changes (or system pref changes)
  useEffect(() => {
    const r = theme === "system" ? systemPref() : theme;
    setResolved(r);
    applyClass(r);
    localStorage.setItem(STORAGE_KEY, theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const next = mq.matches ? "dark" : "light";
        setResolved(next);
        applyClass(next);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Sync from profile on login
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("ui_theme").eq("id", user.id).maybeSingle().then(({ data }) => {
      const t = (data as any)?.ui_theme as ThemeMode | undefined;
      if (t && t !== theme) setThemeState(t);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    if (user) supabase.from("profiles").update({ ui_theme: t } as any).eq("id", user.id).then(() => {});
  }, [user]);

  const toggle = useCallback(() => setTheme(resolved === "dark" ? "light" : "dark"), [resolved, setTheme]);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
};

export const useTheme = () => useContext(ThemeCtx);
