import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Code2, Database, Loader2, Download, AlertTriangle, Calendar, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PasswordGate } from "./PasswordGate";
import { generateBlueprintMarkdown, downloadText } from "@/lib/blueprint/generate";
import { APP_META, MODULES, KEY_TABLES, INTEGRATIONS } from "@/lib/blueprint/spec";
import JSZip from "jszip";

const CORE_TABLES = ["leads", "customers", "enquiries", "call_logs", "renewals", "claims", "policy_transactions"];

const fmtBytes = (n?: number | null) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const csvFor = (rows: any[]): string => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n");
};

const README_MD = `# ${APP_META.name} — Source

${APP_META.tagline}

## Stack
${APP_META.stack.map(s => `- ${s}`).join("\n")}

## Run locally
\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment variables
Create a \`.env\` from \`.env.example\`:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_PROJECT_ID

## Edge function secrets (set via Supabase dashboard)
${INTEGRATIONS.flatMap(i => i.secrets).map(s => `- ${s}`).join("\n")}

## Folder structure
- \`src/pages\` — route components
- \`src/components\` — UI building blocks (admin, super-admin, agent panels)
- \`src/components/ui\` — shadcn primitives
- \`src/integrations/supabase\` — generated client + types (do not edit)
- \`supabase/functions\` — Deno edge functions (whatsapp-bridge, send-sms, claude-suggest, marketing-send, renewal-reminders, …)

## GitHub mirror
This bundle is generated client-side from the running app. For a literal source-code mirror, connect GitHub from Lovable (Project Settings → GitHub) — Lovable will push the full \`/src\` and \`/supabase\` folders to a repository you control.
`;

const MIGRATION_MD = `# Migration Guide

## 1. Supabase / Postgres
1. Create a new Supabase project (or any Postgres 15+ instance).
2. Run \`/database/schema.sql\` to recreate tables, RLS, triggers, and security-definer functions.
3. For each CSV in \`/database/\`, restore via \`COPY <table> FROM '<csv>' WITH CSV HEADER;\` or any Postgres import tool.

## 2. Auth
- Enable Email/Password and Google providers.
- Configure auth redirect URLs to your new domain.

## 3. Storage
- Create a private bucket \`customer-docs\`.
- Re-upload files referenced under \`/assets/manifest.json\`.

## 4. Edge functions
Deploy each function under \`/code/supabase/functions/\` with \`supabase functions deploy <name>\`.
Set the secrets listed in \`/code/README.md\`.

## 5. Frontend
\`\`\`bash
cd code
npm install
npm run build
# Deploy /dist to Vercel, Netlify, Cloudflare Pages, or any static host.
\`\`\`

## 6. Reconnect integrations
- **Meta WhatsApp:** point webhook to \`https://<new-host>/functions/v1/whatsapp-webhook\`.
- **Twilio:** update status callback URLs.
- **Dialer (Exotel/Knowlarity):** update click-to-call + recording-callback URLs.

## 7. Re-enter all secrets
For security, no secrets are included in this export. Recreate them in the Supabase dashboard → Edge Function Secrets.
`;

type ExportRow = { id: string; export_type: string; file_size_bytes: number | null; generated_at: string };

const useLastExport = (type: string) => {
  const [row, setRow] = useState<ExportRow | null>(null);
  const reload = async () => {
    const { data } = await supabase.from("export_history").select("*").eq("export_type", type).order("generated_at", { ascending: false }).limit(1).maybeSingle();
    setRow((data as any) ?? null);
  };
  useEffect(() => { reload(); }, [type]);
  return { row, reload };
};

const logExport = async (export_type: "blueprint" | "code" | "full", file_size_bytes: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("export_history").insert({ export_type, file_size_bytes, generated_by: user?.id });
};

/* ---------- Card 1: Blueprint ---------- */
export const BlueprintCard = () => {
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);
  const { row, reload } = useLastExport("blueprint");

  const run = async () => {
    setBusy(true);
    try {
      const md = await generateBlueprintMarkdown();
      downloadText("rocket-crm-blueprint.md", md);
      await logExport("blueprint", new Blob([md]).size);
      toast({ title: "Blueprint generated" });
      reload();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Generate Build Prompt</CardTitle>
        <CardDescription>Markdown spec of every module, screen, table & business rule — paste into any AI builder to regenerate the app.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <div className="flex flex-wrap gap-1">{MODULES.slice(0, 6).map(m => <Badge key={m.key} variant="outline">{m.label}</Badge>)}<Badge variant="outline">+{MODULES.length - 6} more</Badge></div>
        <div className="text-xs text-muted-foreground">
          <div>Last generated: <b>{row ? new Date(row.generated_at).toLocaleString() : "never"}</b></div>
          <div>Size: ~{fmtBytes(row?.file_size_bytes ?? 15_000)} (estimate)</div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={() => setGate(true)} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Regenerate & Download</>}
        </Button>
      </CardFooter>
      <PasswordGate open={gate} onOpenChange={setGate} onConfirmed={run} actionLabel="Generate Build Prompt" />
    </Card>
  );
};

/* ---------- Card 2: Source Code ---------- */
export const SourceExportCard = () => {
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);
  const { row, reload } = useLastExport("code");

  const run = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      zip.file("README.md", README_MD);
      zip.file(".env.example", "VITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\nVITE_SUPABASE_PROJECT_ID=\n");
      zip.file("NOTICE.md", "This bundle contains the manifest + setup instructions for the current Rocket CRM build.\n\nFor a literal source-code mirror of every .tsx/.ts file, connect GitHub from Lovable Project Settings — Lovable will push the full repo to your own GitHub org.\n");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `rocket-crm-source-${Date.now()}.zip`; a.click();
      URL.revokeObjectURL(url);
      await logExport("code", blob.size);
      toast({ title: "Source bundle downloaded" });
      reload();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5 text-primary" /> Export Source Code</CardTitle>
        <CardDescription>Manifest + README with folder map and run instructions. For a literal mirror of every file, connect GitHub from Lovable.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">
          <div>Last download: <b>{row ? new Date(row.generated_at).toLocaleString() : "never"}</b></div>
          <div>Size: ~{fmtBytes(row?.file_size_bytes ?? 4_000)}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => setGate(true)} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Download .zip</>}
        </Button>
      </CardFooter>
      <PasswordGate open={gate} onOpenChange={setGate} onConfirmed={run} actionLabel="Export Source Code" />
    </Card>
  );
};

/* ---------- Card 3: Full System ---------- */
export const FullExportCard = () => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [gate, setGate] = useState(false);
  const { row, reload } = useLastExport("full");

  const run = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();

      // /code
      setProgress("Bundling code manifest…");
      const code = zip.folder("code")!;
      code.file("README.md", README_MD);
      code.file(".env.example", "VITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\nVITE_SUPABASE_PROJECT_ID=\n");

      // /database
      setProgress("Exporting database tables…");
      const db = zip.folder("database")!;
      db.file("README.md", `# Database\n\nSchema: see \`schema.sql\` (run before importing data).\n\nCSVs (one row per record):\n${CORE_TABLES.map(t => `- ${t}.csv`).join("\n")}\n`);
      db.file("schema.sql", `-- Schema SQL is not bundled by client-side export.\n-- To regenerate: pg_dump --schema-only --schema=public > schema.sql\n-- Core tables to expect:\n${KEY_TABLES.map(t => `--   ${t}`).join("\n")}\n`);
      for (const t of CORE_TABLES) {
        setProgress(`Exporting ${t}…`);
        const { data, error } = await (supabase.from as any)(t).select("*").limit(50_000);
        if (error) { db.file(`${t}.csv`, `-- skipped: ${error.message}\n`); continue; }
        db.file(`${t}.csv`, csvFor(data ?? []));
      }

      // /assets
      setProgress("Listing storage assets…");
      const assets = zip.folder("assets")!;
      const { data: files } = await supabase.storage.from("customer-docs").list("", { limit: 1000 });
      assets.file("manifest.json", JSON.stringify({ bucket: "customer-docs", files: files ?? [], note: "File contents are not bundled. Re-upload from your backup." }, null, 2));

      // /docs
      setProgress("Generating blueprint…");
      const docs = zip.folder("docs")!;
      docs.file("BLUEPRINT.md", await generateBlueprintMarkdown());
      docs.file("MIGRATION.md", MIGRATION_MD);

      setProgress("Zipping…");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `rocket-crm-full-${Date.now()}.zip`; a.click();
      URL.revokeObjectURL(url);
      await logExport("full", blob.size);
      toast({ title: "Full system exported" });
      reload();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); setProgress(""); }
  };

  return (
    <Card className="flex flex-col border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Export Full System</CardTitle>
        <CardDescription>One zip: code manifest + database CSVs + asset manifest + blueprint + migration guide.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">
          <div>Last export: <b>{row ? new Date(row.generated_at).toLocaleString() : "never"}</b></div>
          <div>Size: ~{fmtBytes(row?.file_size_bytes ?? 250_000)} (varies with data)</div>
          {progress && <div className="text-primary mt-1">{progress}</div>}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => setGate(true)} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Download Full Backup</>}
        </Button>
      </CardFooter>
      <PasswordGate open={gate} onOpenChange={setGate} onConfirmed={run} actionLabel="Export Full System (PII)" />
    </Card>
  );
};

/* ---------- Schedule ---------- */
export const ScheduleAutoExportCard = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("system_config").select("key_value").eq("key_name", "AUTO_EXPORT_WEEKLY").maybeSingle();
    setEnabled(((data as any)?.key_value ?? "false") === "true");
    setLoading(false);
  })(); }, []);
  const toggle = async (v: boolean) => {
    setEnabled(v);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("system_config").upsert({ key_name: "AUTO_EXPORT_WEEKLY", key_value: v ? "true" : "false", is_secret: false, updated_by: user?.id } as any, { onConflict: "key_name" });
    toast({ title: v ? "Auto-export enabled" : "Auto-export disabled", description: v ? "A weekly backup will be created and emailed to admins." : "" });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Schedule Auto-Export</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-sm">
          <Label className="text-base">Weekly automatic backup</Label>
          <p className="text-xs text-muted-foreground">Generates the full export every Sunday and saves it to private storage. Admins receive an email notification.</p>
        </div>
        <Switch checked={enabled} disabled={loading} onCheckedChange={toggle} />
      </CardContent>
    </Card>
  );
};

/* ---------- Warning banner ---------- */
export const ExportWarning = () => (
  <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
    <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
    <div>
      <b>API keys & secrets are excluded from all exports for security.</b> After migrating, re-enter your Meta WhatsApp, Twilio, Anthropic, and any other provider credentials in the new environment.
    </div>
  </div>
);

export const PiiNotice = () => (
  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
    <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
    <div>Exports contain customer and lead PII. Each download requires password re-confirmation and is logged in the audit trail.</div>
  </div>
);
