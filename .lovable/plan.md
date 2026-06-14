
# Rocket CRM — Master Upgrade Plan

Scope is large. I'll ship in **3 sequential migrations + ~25 file changes**, all in this session, but split into 3 logical phases so each is reviewable.

---

## Phase 1 — Sidebar Restructure & Merged Tab Pages

**Sidebar (`AdminSidebar.tsx`) — new structure:**

```
DASHBOARDS
  • Overview
  • Reports Hub          → tabs: Call Reports | Reports & Performance
SALES
  • Calling
  • Leads & Enquiries    → tabs: Leads | Enquiries
  • Customers            → tabs: Customer 360 | Customers Won | Add Customer
OPERATIONS
  • Renewals (NEW)       → tabs: Queue | Campaigns | Templates | Analytics
  • Claims, Motor, Health, Life, RTO ... (existing)
ADMIN
  • Team, Settings (with new Renewal Settings section), etc.
```

**New wrapper pages:**
- `src/components/admin/ReportsHubPanel.tsx`
- `src/components/admin/LeadsEnquiriesPanel.tsx`
- `src/components/admin/CustomersHubPanel.tsx`
- `src/components/admin/renewals/RenewalsPanel.tsx` (top-level with sub-tabs)

`AdminDashboard.tsx` router updated; old standalone routes removed from sidebar (components stay, just embedded as tabs).

---

## Phase 2 — Data Layer (Migration #1)

**New tables** (with GRANTs + RLS + company scoping):

- `renewals` — id, company_id, customer_id, lead_id, policy_type, expiry_date, premium_amount, assigned_telecaller_id, original_telecaller_id, status (pending/contacted/renewed/lost), last_contact_at
- `renewal_templates` — id, company_id, name, channel (whatsapp/rcs/sms/voice), body_text, variables (jsonb), is_active
- `renewal_campaigns` — id, company_id, name, channel, template_id, filter (jsonb), sent_count, response_count, status, created_by
- `campaign_logs` — id, campaign_id, customer_id, channel, status, error, sent_at, response_at
- `admin_renewal_settings` — singleton per company: default_telecaller_id, alert_days (int[]), default_channel, auto_assign_logic, auto_send_enabled

**Triggers / functions:**
- `lead_to_customer_on_won()` — AFTER UPDATE on `leads`: when status→`won`, upsert into `customers` (company_name default 'Rocket'), copy fields, create `renewals` row if policy_expiry_date present.
- `assign_renewal_telecaller()` — BEFORE INSERT on `renewals`: applies auto_assign_logic from settings.
- `set_updated_at` triggers on all new tables.

**RLS:**
- Telecallers: `assigned_telecaller_id = auth.uid()` only
- Managers: rows where assigned telecaller has `manager_id = auth.uid()`
- Admins: all rows in their company_id

---

## Phase 3 — Renewal Module UI

**`renewals/RenewalQueue.tsx`**
- Table: Customer | Mobile | Policy | Expiry | Days Left (color badge red≤7, orange≤15, yellow≤30, green>30) | Telecaller | Status | Actions dropdown
- Filters: expiry range, policy type, telecaller, status
- Auto-refresh every 5 min (`useQuery refetchInterval`)
- Actions: Send WA / Send SMS / Schedule Call / Assign Telecaller / Mark Renewed / Mark Lost
- Role-based query filter (telecaller sees own only)

**`renewals/CampaignRunner.tsx`** — modal
- Filters → preview list → channel → template → preview message → confirm dialog → batch send
- Writes `renewal_campaigns` + per-row `campaign_logs`

**`renewals/TemplateManager.tsx`**
- CRUD WA / RCS / SMS templates with variable chips `{customer_name}` `{policy_type}` `{expiry_date}` `{premium_amount}` `{agent_name}`
- Live preview

**`renewals/RenewalAnalytics.tsx`**
- Cards: due this month, contacted, pending, renewed, lost, conversion %
- Channel breakdown bar chart (recharts)
- Telecaller performance table

**`renewals/RenewalSettings.tsx`** — embedded in GeneralSettings
- Default telecaller dropdown
- Alert days multi-checkbox [1,7,15,30,60]
- Default channel select
- Auto-assign logic radio (original / default / fallback)
- Auto-send toggle

---

## Phase 4 — Mobile Search & Auto-Fill

New component `src/components/MobileNumberSearch.tsx`:
- Debounced input (10-digit validation)
- Edge function `lookup-by-phone` queries `leads`, `customers`, `enquiries` in parallel, returns first match
- Result card → "Add to System" button emits `onPrefill(data)` callback
- Embedded in: Leads & Enquiries page header, Add Customer form

---

## Phase 5 — Twilio Integration (WhatsApp + SMS + Voice trigger)

User confirmed "sare ek sath karo". I'll connect **Twilio** (it covers WhatsApp Business, SMS, and Voice via one connector). RCS isn't directly in Twilio's standard API yet — I'll implement RCS as a stub channel that records to `campaign_logs` with `status='pending_rcs_provider'` and clearly note in UI; can swap provider later.

**Edge functions (new):**
- `lookup-by-phone` — search across 3 tables
- `send-renewal-message` — single send (WA/SMS via Twilio gateway); honors template + variable substitution
- `run-renewal-campaign` — bulk: loads filtered renewals, fans out via `send-renewal-message`, logs each
- Existing `renewal-reminders` cron extended to use admin settings (alert_days + auto_send)

All Twilio calls go via `connector-gateway.lovable.dev/twilio` per gateway pattern. I'll call `standard_connectors--connect` for Twilio at start of phase 5.

---

## Phase 6 — Lead→Customer Auto-Conversion UX

- DB trigger does the insert (Phase 2).
- Frontend: in `LeadActions`, when status set to "Won", show toast "Lead converted to Customer successfully" + invalidate customers query.
- Customer auto-appears in Customer 360 + Add-Customer's company-filter dropdown defaulting to `company_name = 'Rocket'`.

---

## Execution order (this session)

1. **Migration #1** — all new tables, triggers, RLS, GRANTs (one call, awaits approval).
2. After approval: connect Twilio, write all edge functions, deploy.
3. Write all UI files in parallel batches.
4. Update sidebar + AdminDashboard router.
5. Smoke test: open `/admin`, switch to Renewals, verify queue loads, test template create, test campaign dry-run.

---

## Technical notes

- All new components follow existing token style (semantic `bg-card`, `text-foreground`, saffron primary already defined).
- Loading skeletons: reuse `<Skeleton>` from shadcn.
- Role check helper: existing `useAuth().role` + new `useRoleFilter()` hook for renewals query.
- Confirm dialogs: shadcn `AlertDialog` before any bulk send.
- Mobile responsive: tables wrap in `overflow-x-auto` with card-view fallback at `sm:` breakpoint.

---

## What I need from you before starting

1. **Approve this plan** so I can run Migration #1.
2. After migration approval, I'll trigger the **Twilio connection prompt** — you'll need a Twilio account with a WhatsApp-enabled number ready (sandbox number works for testing).
3. If you want **RCS via a real provider** (Gupshup/Sinch), tell me now; otherwise RCS will be a logged-stub channel until you choose.

Reply "go" to start.
