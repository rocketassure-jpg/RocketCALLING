
# Full Audit Execution Plan

Audit has **27 items** across 4 parts. I'll execute in 4 batches, each ending with a build/lint check. Approve once, I'll run all batches back-to-back and report at the end.

Note: DB already has a `lead_to_customer_on_won` trigger that fires on `status='won'`. The audit refers to status `'Converted'`. I'll align the trigger + UI to a single canonical value (`'Converted'`) so BUG-1 actually works.

---

## Batch A — Priority 1 (Critical Bugs)

1. **BUG-1**: Update `lead_to_customer_on_won` trigger to fire on `Converted` (case-insensitive), backfill any orphaned converted leads, and add toast in `CallingList.updateStatus`. Fix `CustomersPanel` to query `customers` table by `lifecycle_stage`.
2. **BUG-2**: Bridge `lead_notes` ↔ `customer_notes` — in `LeadActions.saveNote`, mirror to `customer_notes` when `lead.customer_id` exists. `LeadTimeline` merges both.
3. **BUG-3**: `TelecallerDashboard` — collapse 3 duplicate `<CallingList>` renders to one; repurpose mobile "leads" tab to "My Customers".
4. **BUG-4**: Rename `"Done"` → `"Policy Issued"` everywhere (CallingList STATUS_OPTIONS, useLeadsPaginated COMPLETED_STATUSES, LeadActions, BulkActionBar, CallReportsPanel, reports/utils). DB migration `UPDATE leads SET status='Policy Issued' WHERE status='Done'`.
5. **BUG-5**: Replace generic "Send Quote" WA button with a Dialog (insurer, premium, IDV, plan, validity, editable message). On send, insert into new `lead_quotes` table + set status to `"Quote Sent"`.
6. **BUG-6**: `useLeadsPaginated.buildQuery` — explicit `.eq("company_id", companyId)` defense-in-depth.

## Batch B — Duplicates / Cleanup

7. **DUP-1**: Delete `CustomersPanel.tsx`; `CustomersHubPanel` "Customers Won" tab → `Customer360Panel` filtered by `lifecycle_stage in ('policy_holder','multi_product','loyal')`.
8. **DUP-2**: Remove the add-note textarea from `LeadTimeline` (read-only timeline).
9. **DUP-3**: Remove direct Motor/Health/Life entry points from `AdminSidebar`; keep entry only via Customers Hub → Policies & Services.
10. **DUP-5**: New `useIRDAIRates()` hook reading from `app_settings.irdai_rates` JSONB; `PremiumCalculator` consumes it.
11. **DUP-6**: Hardcoded WA strings (`introMsg/smsMsg/quoteMsg`) → load from `message_templates` (category: intro/sms/quote).
12. **DUP-7**: Mark `ReportsAndPerformancePanel` + `CallReportsPanel` as deprecated; route their slots to `ReportsHubPanel` tabs.

## Batch C — Lifecycle Gaps

13. **GAP-1**: `EnquiriesPanel` — "Convert to Lead" button + dialog; add `enquiries.converted_lead_id`.
14. **GAP-3**: After `customer_products` insert (in `AddProductDialog`), update `customers.lifecycle_stage='policy_holder'` + lifecycle event. (DB trigger `log_lifecycle_on_product` already does this — just verify and add UI feedback.)
15. **GAP-4**: `renewals.customer_id` FK already present in trigger. Add "View Customer 360" link in `RenewalCommandCenter`. On status='renewed' → lifecycle event 'loyal'/'renewal'.
16. **GAP-5**: `AddProductDialog` — auto-call `compute_cross_sell` RPC after insert (already trigger-driven; add UI badge on Products tab when score≥70).
17. **GAP-6**: On claim insert — lifecycle event already added via `log_lifecycle_on_claim`. Add reversal event on claim `settled`.
18. **GAP-7**: New edge function `auto-renewal-leads` (daily cron). Add `customer_products.renewal_lead_created bool`.
19. **GAP-8**: New `payment_records` table + "Payments" tab in `FinancePanel`. PaymentLink "Mark Paid" inserts.

## Batch D — Insurance Industry Features

20. **INS-1**: `leads.policy_number text`. When setting "Policy Issued", dialog forces input.
21. **INS-2**: `vehicles.ncb_percent/last_policy_end_date/claim_free_years`; `motor_policies.ncb_applied`. Calculator auto-fills from vehicle.
22. **INS-3**: `PremiumCalculator` "Compare Insurers" tab — simulated ±5–15% spread across 6 insurers; "Select & Send Quote" hands off to BUG-5 dialog.
23. **INS-4**: `profiles.posp_code/posp_valid_until/exam_passed/exam_date`; UI in `AccountSettings` + `EditMemberDialog`.
24. **INS-5**: `CommissionTracker` — "Generate Invoice" via jsPDF, upload to `invoices/` bucket, update commission row.
25. **INS-6**: WA send logger — every `wa.me` open writes `lead_notes` entry "📱 WhatsApp bheja: …"; CallingList shows "WA Sent" badge when note <24h.

---

## Technical Section

### New tables (migrations)
- `lead_quotes` (BUG-5)
- `payment_records` (GAP-8)
- `invoices` storage bucket (INS-5)

### Altered tables
- `leads`: `customer_id uuid`, `policy_number text`
- `enquiries`: `converted_lead_id uuid`
- `customer_products`: `renewal_lead_created bool`
- `vehicles`: `ncb_percent int`, `last_policy_end_date date`, `claim_free_years int`
- `motor_policies`: `ncb_applied int`
- `profiles`: `posp_code text`, `posp_valid_until date`, `exam_passed bool`, `exam_date date`
- `app_settings`: `irdai_rates jsonb`

### Updated trigger
- `lead_to_customer_on_won` → match `Converted` (case-insensitive) in addition to `won`.

### New edge function
- `auto-renewal-leads` — daily; reads expiring `customer_products`, inserts `leads`, marks `renewal_lead_created=true`.

### Data migrations
- `UPDATE leads SET status='Policy Issued' WHERE lower(status)='done'`
- Backfill `customers` rows for any historical lead with `status='Converted'` lacking `customer_id`.

### Risk / scope
- ~35 files touched, 8 schema migrations, 1 new edge function, ~1500 LOC.
- Each batch ends with a typecheck. If batch fails, I stop and report — won't push corrupted state to next batch.
- I won't run automated end-to-end tests for every UI flow; you'll need to smoke-test BUG-5 dialog, Enquiry→Lead, and the renewal cron manually.

### Out of scope (explicit)
- No design/theme changes
- No auth/role refactor
- No real PolicyBoss API integration (still stubs — separate thread)
