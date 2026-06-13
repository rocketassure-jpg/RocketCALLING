# Insurance Agency Mgmt — Gap Fill Plan

App me bahut kuch already exist karta hai (Accounts, Motor, Health, Life, RTO, Leads/CRM, Telecaller, Companies, Modules, Commission tracker, Renewals, WhatsApp logs, Areas, Audit-ish, Auth + roles). Yeh plan sirf **missing** pieces ko phases me banayega — duplicates avoid.

## What already exists (skip)
- Auth + roles (admin/manager/telecaller) + super-admin + company multi-tenant + module gating
- Leads (CRM core), enquiries, areas, telecaller assignment, call/dial/sms/whatsapp logs
- Insurers, agents_profile, commission_rates, policy_transactions, agent_payouts, commission tracker
- Motor / Health / Life / RTO modules + renewals panel
- WhatsApp templates + bulk messaging UI + logs
- CSV / Smart import, training, branding, API keys, secrets, permissions matrix

## Gaps to build (this plan)

### Phase A — Customer 360 + Family
- New `customers` table (separate from `leads`) with PAN, Aadhaar (masked), DOB, occupation, address, `family_head_id` self-FK, `agent_id`, `branch_id`
- Customer documents bucket + uploads (Aadhaar/PAN/Photo/KYC)
- Family tree view (grouped by family_head_id)
- Global search bar (customers + policies + leads)
- "Convert lead → customer" action on Won leads

### Phase B — Branches + Sub-agent role
- `branches` table (name, address, manager_id)
- Add `branch_id` to profiles + policies + customers
- Add `sub_agent` to `app_role` enum + RLS: sub-agent sees own only, agent sees own, manager sees branch, admin sees company
- Branch master CRUD (super-admin/admin)

### Phase C — Broker engine (the big one)
- `brokers` (separate from insurers — broker = intermediary entity)
- `broker_company_mapping` (broker ↔ insurer + broker_code per insurer)
- `broker_targets` (period_type, period_start/end, product_category, target_amount)
- `broker_slabs` (slab_min/max, commission_rate, effective_from/to, target_id)
- `broker_achievements` (rolling achieved_amount per target)
- `broker_payouts` (expected vs received, UTR, status, discrepancy flag)
- DB trigger: on policy insert/update → auto-pick applicable slab (by date + achievement) → write `final_commission_rate` + `final_commission_amount` → bump `broker_achievements`
- UI: Broker master, Company mapping, Targets + Slabs editor with effective-date versioning, Achievement progress bars, **Slab Simulator** widget, **Multi-broker comparison** (best rate for same product), Payout reconciliation grid

### Phase D — Unified Policies + Claims
- `policies` umbrella table (policy_number, customer_id, company_id, product_id, broker_id, plan_name, premium, sum_assured, dates, status, commission rate/amount, agent_id, branch_id, category)
- `products` table (company_id, product_name, category)
- Keep existing motor/health/life tables — link via `policy_id` FK (one row per policy + category-specific detail)
- Policy PDF + premium receipt upload (Storage bucket)
- `claims` table + Claims kanban (Submitted → Under Process → Approved/Rejected → Settled) + doc upload
- Renewal alerts at 90/60/30/7/0 days (already partly there — extend with reminder log + status)

### Phase E — Operations
- `expenses` (branch, category, amount, date) + monthly P&L view (commissions received − expenses)
- `premium_remittance` (per policy/broker, expected vs remitted, status)
- `complaints` + `service_requests` (open/in-progress/resolved + TAT calc)
- `compliance_tracker` (agent license expiry alerts)
- `audit_logs` (user, action, table, record, ts) + DB trigger on key tables
- `tasks` table + Calendar (day/week/month) + task list

### Phase F — Reports + UX polish
- Premium collection report (filters: date / company / broker / product)
- Company-wise, product-wise, agent-performance, broker distribution charts (recharts)
- Lead conversion funnel
- Sidebar regrouped into: CRM • Policies • Broker & Payout • Operations • Reports • Settings
- Color-coded status badges across tables
- Mobile-responsive review of all new screens

## Tech notes
- All new tables: company-scoped RLS using `user_company_id()` + role checks via `has_role` / new `is_branch_manager`
- Effective-date slab pick = SQL function `get_applicable_slab(broker_id, category, amount, on_date)` SECURITY DEFINER
- Storage buckets: `customer-docs` (private), `policy-docs` (private), `claim-docs` (private)
- Edge functions: `slab-simulator`, `renewal-reminder-cron`, `pnl-summary`
- Every new public table gets explicit GRANTs + RLS + policies (per project rules)

## Sequencing
Phase A → B → C → D → E → F, each phase shipped end-to-end (migration + UI + nav wiring) and verified before next.

## Ask
Reply **"go phase A"** to start with Customer 360 + Family + Global search. Or pick any phase out of order (e.g. "start phase C — brokers first").