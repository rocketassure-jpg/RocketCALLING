# Payout Setup Engine — Plan

**Location:** Admin Dashboard → Settings → "Master Payout Setup Engine" (new tab inside Settings, matching existing tab styling — same theme/colors as other Settings tabs like API Keys, Branding, etc.)

## Header
- Title: **Payout Setup Engine**
- Subtitle: *Configure all commission, payout, margin and pricing rules from one central location.*
- Right-side **Effective Month** selector (`YYYY-MM`) — every tab reads/writes scoped to selected month. Default = current month. Toggle "Apply to future months" when saving.

## 8 Sub-Tabs (same compact tab style as Settings)

1. **Insurance Commission Rules** — table: Insurer, Product Category, Sub Category, Commission Type (% / Flat / Slab), Commission %, Status, Last Updated, Actions. Add / Edit / Delete / Bulk Excel Upload (with downloadable demo template) / Search / Filter by Company / Filter by Product.
2. **Agent Split Rules** — Rule Name, Commission %, Agent %, Branch %, Admin %, Referral %, Status. Validation: splits sum = 100%. Live Calculator: enter premium → shows Commission + split breakdown.
3. **RTO Pricing Rules** — Service, Govt Fee, Customer Price, Agent Payout, Auto-calculated Margin (Customer − Govt − Agent), Processing Days, Status. Add / Edit / Bulk Upload.
4. **Finance Commission Rules** — Bank, Product, Commission %, Processing Fee, Agent Share %, Status. Live calculator: Loan Amount × Commission %.
5. **Vendor Rules** — Vendor Name, Vendor Type (Broker / POS / DSA / Insurance Company / Aggregator), Product Type, Commission Rule (link to rule), Status. Full CRUD + bulk import.
6. **State Wise Rules** — State, RTO Charges, Stamp Duty, Special Tax, Status.
7. **Tax & GST Rules** — GST %, TDS %, Service Tax rules, Invoice numbering prefix/format. Auto-GST + auto-invoice toggles.
8. **Audit Logs** — User, Module, Action, Date, Old Value, New Value (read from existing `audit_logs` table, filtered to payout tables).

## Month-wise Versioning (key requirement)
Every rule row has `effective_month` (date, first-of-month). When the admin changes a value for a new month, a **new row** is inserted instead of updating the old one — so:
- Current policies/RTO/finance entries use the **latest rule for current month**.
- Historical entries already stored with their snapshot values (commission_amount, agent_payout, etc. on `policy_transactions`, `rto_cases`, etc.) remain untouched — they reflect the rate that was active when the entry was created.
- A `get_active_rule(_month, _key…)` SQL helper returns the row with the greatest `effective_month <= _month`.

## Bulk Import
Each tab with a table has:
- **Download Demo Excel** button (pre-filled template with sample rows).
- **Import Excel** button → parses with SheetJS in browser → preview diff → bulk insert with selected effective month.

## Database (new migration)
New tables, all `company_id` scoped, RLS to company admins + super admin, GRANT to authenticated + service_role:
- `payout_insurance_rules` (insurer_id, product_category, sub_category, commission_type, commission_pct, flat_amount, effective_month, is_active)
- `payout_agent_split_rules` (rule_name, commission_pct, agent_pct, branch_pct, admin_pct, referral_pct, effective_month, is_active)
- `payout_rto_rules` (service_name, govt_fee, customer_price, agent_payout, processing_days, effective_month, is_active) — margin computed on read
- `payout_finance_rules` (bank, product, commission_pct, processing_fee, agent_share_pct, effective_month, is_active)
- `payout_vendor_rules` (vendor_name, vendor_type, product_type, commission_rule_ref, effective_month, is_active)
- `payout_state_rules` (state, rto_charges, stamp_duty, special_tax, effective_month, is_active)
- `payout_tax_rules` (gst_pct, tds_pct, service_tax_pct, invoice_prefix, invoice_format, effective_month, is_active)

SQL helper `public.get_active_payout_rule(table_name, company_id, lookup_keys jsonb, on_month date)` — returns latest row ≤ month.

Existing `policy_transactions`, `rto_cases`, `agent_payouts` etc. already snapshot amounts → no change to historical math.

## Frontend Files
- `src/components/admin/payout/PayoutSetupEngine.tsx` — shell + month selector + 8 tabs
- `src/components/admin/payout/tabs/InsuranceCommissionTab.tsx`
- `src/components/admin/payout/tabs/AgentSplitTab.tsx` (with live calculator)
- `src/components/admin/payout/tabs/RtoPricingTab.tsx`
- `src/components/admin/payout/tabs/FinanceCommissionTab.tsx` (with live calculator)
- `src/components/admin/payout/tabs/VendorRulesTab.tsx`
- `src/components/admin/payout/tabs/StateWiseTab.tsx`
- `src/components/admin/payout/tabs/TaxGstTab.tsx`
- `src/components/admin/payout/tabs/AuditLogsTab.tsx`
- `src/components/admin/payout/shared/BulkImportButton.tsx` (SheetJS — `xlsx` package)
- `src/components/admin/payout/shared/MonthPicker.tsx`
- Add new sub-tab "Master Payout" inside existing Settings tabs list in `AdminDashboard.tsx`.

## Theme
Reuse existing tokens (`bg-card`, `border-border`, `text-foreground`, `Tabs`, `Card`, `Table`, `Button`, `Badge` from shadcn). No hardcoded colors. Compact density matching current Settings tabs.

## Build Order
1. Migration: 7 new payout tables + helper function + GRANT/RLS.
2. Shell `PayoutSetupEngine.tsx` + month picker + register inside Settings.
3. Tabs 1–7 one-by-one (each follows the same CRUD pattern using a shared hook `usePayoutRules(table, month)`).
4. Bulk import + demo Excel downloads.
5. Tab 8 Audit Logs (filter existing audit_logs by `table_name LIKE 'payout_%'`).
6. Verify build, sanity-check on `/admin` → Settings → Master Payout.

## Out of Scope (will not change in this pass)
- Calculation engine wiring inside policy/RTO/finance create flows (current flows already snapshot amounts; rules become the *source* admins edit). If you want me to also rewire the create-flow autocalc to pull from these rules, confirm — that's a follow-up task.
