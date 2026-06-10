# Rocket Services CRM — Modular Architecture Rollout

This is ~6 modules + super admin + subscription billing. Way too big for one pass. Splitting into 5 phased deliveries. Each phase is its own "go" — confirm phase 1 first, then we move to 2, etc.

## Scope reality check

You previously said **skip multi-tenant** ("purana admin / Telecaller account chalne do"). This new spec **requires** multi-tenant — `companies` table, `company_id` on every row, super-admin role above admin. I'll bring it back, but cleanly: existing users get migrated into a single default company so nothing breaks.

What I'm intentionally NOT building (tell me if you want any):
- Payment gateway / auto-billing — super admin sets module access manually
- Module-level RLS rewrite across every existing table — instead, a single client-side `useModuleAccess()` gate + sidebar filtering. Backend stays open for now; harden later.
- Government API integrations (RTO, Vahan, IRDAI) — pure CRM tracking only
- Document OCR / auto-parsing of policy PDFs — manual entry first

---

## Phase 1 — Foundation (multi-tenant + module system) 🧱

DB:
- `companies` (name, code, plan, created_by)
- `modules` (seed 6 rows: crm, accounts, motor, health, life, rto)
- `company_subscriptions` (company_id, module_key, billing_cycle, start/end, status)
- Add `company_id` to: `profiles`, `leads`, `areas`, `app_settings`
- New role: `super_admin` in `app_role` enum
- Function `get_active_modules(company_id)` + RLS helper `user_company_id()`
- Migration: bucket all existing data into a single "Default Company"

Frontend:
- `CompanyProvider` context (resolves current user's company)
- `useModuleAccess(key)` hook + `<ModuleGate>` wrapper
- New `/super-admin` route (gated by super_admin role)
- Super admin page: companies list + per-company module toggle panel (the table you mocked)
- Signup flow updated: Company Code field (joins existing co) or "Create new company" (becomes admin of new co)

**Deliverable:** Existing app keeps working unchanged for current admin. New super_admin can create companies and toggle modules. Sidebar filtering is wired but only CRM+Accounts modules exist yet (others come in later phases).

---

## Phase 2 — Sidebar refactor + Accounts module 💰

- Replace `HamburgerMenu` with shadcn `Sidebar` (collapsible, mobile drawer)
- Module-driven nav rendering (the combined sidebar tree from your spec)
- Accounts module tables:
  - `insurers` (master)
  - `commission_rates` (insurer × policy_type)
  - `agents_profile` (direct/posp/proxy + split %)
  - `policy_transactions` (od/tp/net/gst/commission/payout)
  - `agent_payouts` (monthly settlement)
- Pages: Insurer Master, Commission Rates, Agents, Transactions, Commission Tracker (Expected/Received/Overdue tabs), Agent Payouts, TDS register
- Reports: insurer-wise, agent-wise, payout calendar

---

## Phase 3 — Motor Insurance module 🚗

- Tables: `vehicles`, `motor_policies`, `puc_records`, `fitness_certificates`, `permits`, `rc_register`
- Client profile → Motor tab (vehicle cards with policy/PUC/FC/permit/RC summary)
- Motor Policy form (6 sections per spec)
- 4 tracker pages (PUC / Fitness / Permit / RC) with expiry color coding
- Renewal alerts auto-feed into CRM calling list (60/30/15/7 day buckets)
- Accounts transactions filtered to motor when this module active

---

## Phase 4 — Health + Life Insurance modules 🏥🛡️

Health:
- `health_policies` + `health_policy_members` (dynamic family floater)
- TPA details, pre-existing, add-ons, group health (corporate)
- Individual / Family / Group tabs

Life:
- `life_policies` + `life_nominees` + `life_premium_schedule`
- Premium Calendar (month view), Lapsed Tracker with revival window calc
- ULIP / Endowment / Money Back / Term type-specific fields
- Premium-due alerts → calling list

---

## Phase 5 — RTO Services module 🏛️

- `rto_service_types` (seed 30+ services across 9 categories)
- `rto_cases` (client, vehicle, service, app_no, status, dates)
- `rto_case_documents` (auto-checklist per service type)
- `rto_status_history` (timeline)
- Auto-WhatsApp on status change
- Service charges flow into Accounts as "service revenue" (separate from commission)
- P&L split: Service Revenue vs Insurance Commission

---

## Tech notes

- All new tables get `company_id UUID NOT NULL` + RLS `using (company_id = user_company_id())`
- All new public tables get `GRANT SELECT/INSERT/UPDATE/DELETE TO authenticated` + `GRANT ALL TO service_role`
- `useModuleAccess` returns `{ loading, has, modules[] }` — cached via React Query
- Sidebar: keep current `HamburgerMenu` working in parallel until Phase 2 ships, then deprecate
- Existing leads' phone masking, dual view, branding, theme — all keep working across all phases (already shipped)

---

## What I need from you

1. **Confirm Phase 1 scope** — say "go phase 1" and I'll ship the foundation (migration + super admin + signup with company code).
2. **Trim anything?** e.g. drop Life or RTO if not needed soon
3. **Default Company name** for the data migration — e.g. "Rocket Services HQ"? Default I'll use: "Rocket Services"
4. **Your super_admin email** — so the migration can flag your account as super_admin (or I'll just flag the first admin user)

Reply with **"go phase 1"** + any answers and I start. After phase 1 is verified working, you say "go phase 2", etc.
