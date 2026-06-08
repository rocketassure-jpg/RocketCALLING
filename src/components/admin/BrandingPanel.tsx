import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Palette, RotateCcw, Save, Loader2 } from "lucide-react";
import { useSettings, BrandConfig } from "@/contexts/SettingsContext";

const DEFAULT: BrandConfig = {
  primary: "0 85% 50%",
  secondary: "14 90% 55%",
  sidebar_bg: "0 0% 100%",
  logo_url: "",
  company_name: "Rocket Services",
};

// hex <-> hsl helpers (string format "H S% L%")
const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return DEFAULT.primary;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToHex = (hsl: string): string => {
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if (isNaN(h) || isNaN(s) || isNaN(l)) return "#000000";
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const ColorRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-3">
    <Label className="w-40 shrink-0">{label}</Label>
    <input
      type="color"
      value={hslToHex(value)}
      onChange={(e) => onChange(hexToHsl(e.target.value))}
      className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
    />
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" placeholder="H S% L%" />
  </div>
);

export const BrandingPanel = () => {
  const { brand, saveBrand } = useSettings();
  const [draft, setDraft] = useState<BrandConfig>(brand);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(brand); }, [brand]);

  const update = (k: keyof BrandConfig, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  // live preview on draft
  useEffect(() => {
    const root = document.documentElement;
    const prev = {
      p: root.style.getPropertyValue("--primary"),
      a: root.style.getPropertyValue("--accent"),
      s: root.style.getPropertyValue("--sidebar-background"),
    };
    root.style.setProperty("--primary", draft.primary);
    root.style.setProperty("--accent", draft.secondary);
    root.style.setProperty("--sidebar-background", draft.sidebar_bg);
    return () => {
      root.style.setProperty("--primary", prev.p || brand.primary);
      root.style.setProperty("--accent", prev.a || brand.secondary);
      root.style.setProperty("--sidebar-background", prev.s || brand.sidebar_bg);
    };
  }, [draft, brand]);

  const save = async () => {
    setSaving(true);
    await saveBrand(draft);
    setSaving(false);
    toast({ title: "Branding saved" });
  };

  const reset = async () => {
    setDraft(DEFAULT);
    await saveBrand(DEFAULT);
    toast({ title: "Reset to default branding" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Company Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input value={draft.company_name} onChange={(e) => update("company_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input value={draft.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://…/logo.png" />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">Colors (HSL — H S% L%)</div>
          <ColorRow label="Primary"   value={draft.primary}     onChange={(v) => update("primary", v)} />
          <ColorRow label="Secondary" value={draft.secondary}   onChange={(v) => update("secondary", v)} />
          <ColorRow label="Sidebar BG" value={draft.sidebar_bg} onChange={(v) => update("sidebar_bg", v)} />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Live preview</div>
          <div className="flex flex-wrap items-center gap-2">
            {draft.logo_url
              ? <img src={draft.logo_url} alt="logo" className="h-10 w-10 rounded object-contain" />
              : <div className="h-10 w-10 rounded bg-primary" />}
            <div className="font-bold">{draft.company_name || "Company"}</div>
            <Button variant="hero" size="sm">Primary button</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">Accent badge</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="hero" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save branding
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
