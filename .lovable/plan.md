# Marketing Automation Module — Build Plan

A complete Marketing Hub under the Tools group in Admin sidebar with multi-channel outreach (WhatsApp / SMS / RCS / AI Voice / Meta / Instagram / LinkedIn), templates, campaigns, social scheduler, audience sync, and renewal automation settings.

## Step 1 — Database migration (single file)

New tables (all with `company_id`, RLS via `has_role(auth.uid(),'admin') OR company_id = user_company_id()`, GRANTs to authenticated + service_role):

- `marketing_integrations` — per-channel credentials (WA / SMS / RCS / Voice / Meta / IG / LinkedIn)
- `marketing_templates` — multi-channel template library with variables JSON
- `audience_sync_configs` + `audience_sync_logs` — Meta Custom Audiences sync rules
- `scheduled_posts` + `social_post_logs` — Social scheduler queue
- `wa_webhook_messages` — inbound WhatsApp messages

Existing tables touched:
- `renewal_campaigns` — ADD missing columns (`name`, `filter_expiry_from/to`, `filter_policy_type`, `filter_city`, `filter_telecaller_id`, `scheduled_at`, `total_targets`, `delivered_count`, `replied_count`, `converted_count`) — keep current data intact.
- `campaign_logs` — ADD `customer_name`, `phone_number`, `delivered_at`, `replied_at`, expand status check to include `queued/delivered/replied/opted_out`.
- `app_settings` — ADD `renewal_default_telecaller_id`, `renewal_alert_days`, `renewal_default_channel`, `renewal_auto_assign_logic`, `renewal_auto_send`, `renewal_default_template_id`.

Triggers: `set_updated_at` on `marketing_integrations`.

Cron jobs (`pg_cron` + `pg_net`) — scheduled via `supabase--insert` (not migration) so URL + service-role key stay project-local:
- `renewal-audience-sync-daily` → `0 3 * * *` → `sync-renewal-audiences`
- `social-post-publisher-5min` → `*/5 * * * *` → `social-publish-scheduled`

## Step 2 — Edge functions

1. `_shared/marketing.ts` — `adminClient`, `normalizePhone` (E.164 India), `sha256`, `chunk`, `fillTemplate`, `sendWhatsApp` (Meta Graph v19), `sendSMS` (Msg91), `triggerVoiceCall` (Exotel).
2. `marketing-send` — JWT-gated action router: `send-whatsapp` / `send-sms` / `trigger-voice` / `run-campaign` / `test-connection`. Reuses existing `getClaims` auth pattern.
3. `sync-renewal-audiences` — CRON_SECRET auth (mirrors `renewal-reminders`). For each enabled config: query leads in expiry window, hash phones (SHA-256), POST to Meta `customaudiences/{id}/users` in 10k batches, log run.
4. `social-publish-scheduled` — CRON_SECRET auth. Picks `scheduled_posts` due now, publishes via Graph API per platform, writes `social_post_logs`, updates parent status (`posted` / `partial` / `failed`).
5. `whatsapp-webhook` — REPLACE existing. Verifies x-hub-signature-256 against `wa_webhook_secret`, inserts `wa_webhook_messages`, links to lead by phone, marks matching `campaign_logs.status='replied'`. Always returns 200.

`supabase/config.toml` — add `verify_jwt = false` blocks for the three webhook/cron functions.

## Step 3 — Frontend: MarketingAutomationPanel

New folder `src/components/admin/marketing/` with:

- `MarketingAutomationPanel.tsx` — 5-tab shell.
- `tabs/ConnectedAccountsTab.tsx` + `AddIntegrationDialog.tsx` + `IntegrationCard.tsx` — platform-conditional credential forms, Test / Edit / Delete.
- `tabs/RenewalCampaignsTab.tsx` with sub-tabs `CampaignBuilder.tsx` / `CampaignHistory.tsx` / `CampaignAnalytics.tsx` (recharts bar + line).
- `tabs/TemplatesTab.tsx` + `TemplateEditorDialog.tsx` (variable chips, char counter, channel-specific fields, sample preview).
- `tabs/SocialSchedulerTab.tsx` — composer + scheduled table + expandable logs.
- `tabs/AudienceSyncTab.tsx` — rules CRUD + manual "Sync Now" + recent logs (only renders when Meta integration exists).

Sidebar: add `{ id: "marketing", label: "Marketing Hub", icon: Megaphone, group: "Tools" }` to `BASE_NAV` in `AdminDashboard.tsx`, gated to admin/manager, route case → `<MarketingAutomationPanel />`.

## Step 4 — Renewals upgrade

Update `src/components/admin/renewals/RenewalQueue.tsx`:
- Add row selection checkboxes + bulk action bar ("Run Campaign for Selected", "Assign Selected").
- Per-row `DropdownMenu` actions → `SendMessageDialog` (channel pre-selected, template preview with lead-data fill, invokes `marketing-send`) and `AssignDialog`.
- "Mark Renewed" updates lead status.

## Step 5 — Admin renewal defaults

New section "Renewal Automation Settings" appended to `GeneralSettings.tsx`:
- Default telecaller select, alert-days checkbox group, default channel select, default template select (filtered by channel), auto-assign radio, auto-send switch with helper text.
- Persists to the new `app_settings` columns added in Step 1.

## Technical notes

- All client reads use `(supabase as any).from(...)` pattern.
- Role gating via `useAuth().role`.
- Phones masked with existing mask helper (first 6 + last 2).
- Empty states with deep-links across tabs ("No WhatsApp integration — go to Connected Accounts").
- Loading: `Loader2` spinner; errors: `toast({ variant: "destructive" })`.
- No bulk DMs to non-opted-in users — outreach restricted to existing customers; social = organic posting only.

## Secrets / connectors needed (will request after migration approval)

- Meta Graph API access token + Phone Number ID + WABA ID (entered per-integration row in UI, not as global secret).
- Msg91 / Exotel keys — also per-integration.
- `CRON_SECRET` — already required by existing renewal-reminders; reuse.

No new platform secrets are required up-front; credentials live in `marketing_integrations` rows and are read by edge functions via service-role.

## Order of execution

1. Migration (Step 1) — requires approval.
2. After approval: create all edge functions + shared util + config.toml updates (Step 2).
3. Schedule cron jobs via `supabase--insert`.
4. Build frontend tabs (Step 3) in parallel file writes.
5. Renewals upgrade (Step 4) + GeneralSettings extension (Step 5).
