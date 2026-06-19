# Super Admin Section — System Settings & Blueprint Export

Adds a new admin-only Super Admin area to Rocket CRM with two pages: a consolidated **System Settings** dashboard and a **Blueprint & Export** migration-safety page.

> Note: Much of what you described already exists in this project (a `/super-admin` route with sidebar, `system_config`, `audit_logs`, `feature_flags`, `SecretsManager`, `DataSettingsPanel`, user/role management, module toggles via `company_subscriptions`, message templates, etc.). This plan **reuses** those pieces and adds only what is missing, so we don't duplicate UI or tables.

---

## Page 1 — System Settings

Single page at `/super-admin` → **System Settings** sidebar entry, organized as tabs. Each tab maps to an existing panel where possible:

| Tab | Source |
|---|---|
| App Config | New small form (app name, logo, brand color `#e85d24`, version) → stored in `system_config` |
| User & Role Management | Existing user management panel (promote/demote, deactivate) |
| Module Toggles | Existing module/subscription toggle UI (Lead Capture, WhatsApp, Dialer, Life/Health/Motor, Enquiries, Reports) |
| Data Sources / API Keys | Existing `SecretsManager` (masked inputs + Test Connection already implemented) |
| Notifications | Existing `TemplatesManager` (`message_templates` with `{placeholder}` support) |
| Audit Log | Existing `AuditLogViewer` (read-only, from `audit_logs`) |
| Feature Flags | New panel reading/writing `feature_flags` table |

New work for Page 1:
- `AppConfigPanel.tsx` — name/logo/color/version fields, persisted via `system_config` upserts (audit-logged by existing trigger).
- `FeatureFlagsPanel.tsx` — list + toggle switches on the existing `feature_flags` table.
- Wire both into the System Settings tabs.

---

## Page 2 — Blueprint & Export

New page `/super-admin/blueprint` (sidebar entry "Blueprint & Export"), admin-only, with a password re-auth gate before any download.

Three cards:

**Card 1 — Generate Build Prompt**
- Client-side generator that introspects: enabled modules (`company_subscriptions`), CRM fields (`crm_fields`), lead statuses (`status_mappings`/`lead_statuses`), feature flags, and a static module/screen map maintained in `src/lib/blueprint/spec.ts`.
- Produces a Markdown spec suitable for pasting into any AI builder.
- "Last generated" timestamp + "Regenerate Now" stored in `export_history`.
- Download as `rocket-crm-blueprint.md`.

**Card 2 — Export Source Code**
- Since the running app cannot read its own source, this card calls a new edge function `export-source` that returns a manifest + `README.md` describing folder structure, env vars, and `npm install / npm run dev` steps, plus a pointer to the GitHub repo connected via Lovable. Packaged client-side into a `.zip` using `jszip`.
- Clearly labeled: "Latest committed source — connect GitHub in Lovable for full code mirror."

**Card 3 — Export Full System**
- Client-side `jszip` build combining:
  - `/code` — same manifest/README as Card 2
  - `/database` — schema SQL (fetched from a new edge function `export-schema` using `pg_dump`-style introspection via `information_schema`) + per-table CSV dumps for the core tables (leads, customers, policies, enquiries, call_logs, renewals, claims) using `supabase.from(...).select('*')` with pagination
  - `/assets` — signed-URL list of files in the `customer-docs` bucket
  - `/docs` — generated blueprint markdown + `MIGRATION.md` template
- Single `.zip` download; entry recorded in `export_history`.

Shared UI:
- File-size estimate (computed before zip finalization).
- "Last export" timestamp per card from `export_history`.
- Yellow warning banner: API keys/secrets excluded.
- "Schedule Auto-Export" toggle → writes to `system_config` (`auto_export_weekly = true`) + creates a `pg_cron` job invoking `export-full` weekly, storing the zip in a new private `system-exports` bucket and emailing the admin.
- Password re-auth dialog (re-uses pattern already in `DataSettingsPanel`).

---

## Database changes

Only one new table is needed; the rest already exist:

```sql
CREATE TABLE public.export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL,  -- 'blueprint' | 'code' | 'full'
  file_url text,
  file_size_bytes bigint,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id)
);
-- GRANTs + RLS: super-admin only read/insert
```

Plus:
- New private storage bucket `system-exports` for scheduled auto-exports.
- One row added to `system_config` for `auto_export_weekly`.

No changes to `system_config`, `audit_logs`, `feature_flags` (already present).

---

## Edge functions

- `export-schema` — returns `public` schema DDL as text (super-admin only, JWT-checked).
- `export-source` — returns repo manifest + README (super-admin only).
- `run-weekly-export` — invoked by `pg_cron`, writes zip to `system-exports`, emails admin.

---

## File map

New:
- `src/pages/SuperAdminBlueprint.tsx`
- `src/components/super-admin/AppConfigPanel.tsx`
- `src/components/super-admin/FeatureFlagsPanel.tsx`
- `src/components/super-admin/blueprint/BlueprintCard.tsx`
- `src/components/super-admin/blueprint/SourceExportCard.tsx`
- `src/components/super-admin/blueprint/FullExportCard.tsx`
- `src/components/super-admin/blueprint/PasswordGate.tsx`
- `src/lib/blueprint/spec.ts` (module/screen catalog)
- `src/lib/blueprint/generate.ts` (markdown builder)
- `supabase/functions/export-schema/index.ts`
- `supabase/functions/export-source/index.ts`
- `supabase/functions/run-weekly-export/index.ts`

Edited:
- `src/pages/SuperAdminDashboard.tsx` — restructure System Settings tab to include App Config + Feature Flags; add Blueprint sidebar entry.
- `src/App.tsx` — add `/super-admin/blueprint` route, admin-guarded.

---

## Out of scope / accepted limitations

- True source-code zip requires Lovable to mirror to GitHub; Card 2 ships a manifest + setup README, not raw `.tsx` files. Called out in UI.
- Call recordings are stored externally by the dialer provider — only references are exported, not audio files.
- CSV exports cover the 7 core tables listed; other tables can be added later on request.
