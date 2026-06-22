## Audit findings (live database)

Data state is clean — **zero orphans, zero duplicates** across every relationship I checked. The real problems are **structural** (missing FKs / missing link columns), not data corruption.

### Current row counts
| Entity | Rows |
|---|---|
| customers | 12 |
| leads | 1 |
| claims | 2 |
| customer_products (policies) | **0** |
| renewals | 1 |
| policy_transactions | 26 |

### Orphan / duplicate checks (all PASSED)
- leads → customers: 0 orphans
- renewals → customers / leads: 0 orphans
- claims → customers / policies: 0 orphans
- call_logs → leads: 0 orphans
- customer_products → customers: 0 orphans
- duplicate customer mobiles per company: 0
- duplicate lead phones per company: 0
- active profiles missing a role: 0

### Structural gaps (the real issues)

| # | Issue | Impact |
|---|---|---|
| 1 | `claims.policy_id` has **no FK** to `customer_products` | Claims can point to deleted/wrong policies |
| 2 | `renewals` has no `customer_product_id` | Renewal isn't linked to the actual policy row, only to a free-text `policy_number` |
| 3 | `policy_transactions` has no `customer_id` / `customer_product_id` (only `client_phone`) | 26 txns float unlinked — Customer 360 can't show them, commissions don't tie back to a policy |
| 4 | `call_logs` has no `customer_id` | Calls placed after lead→customer conversion don't appear on Customer 360 timeline |
| 5 | `whatsapp_logs` / `sms_logs` have no `customer_id` / `campaign_id` | Marketing can't track per-customer responses |
| 6 | `claims.client_lead_id` has no FK | Same risk as #1 |
| 7 | `customer_products.agent_id` has no FK to `agents_profile` | Commission ↔ agent join is implicit |
| 8 | No `Lead → Call → Followup → Conversion` view anywhere in UI | Funnel invisible |

### Code-side gaps
- **Customer 360** (`Customer360Panel`) shows products tab but no unified timeline of calls, WhatsApp, SMS, claims, renewals against the customer.
- **Claims panel** displays `policy_id` text but doesn't join `customer_products` to show policy details.
- **Renewals queue** displays `policy_number` string, not the linked policy row.
- **Reports**: no funnel widget (Lead → Call → Conversion), no Customer-LTV widget aggregating products + claims.

---

## Plan

### Phase 1 — Schema migration (single migration, preserves all data)
1. Add FKs (ON DELETE SET NULL) — backfilled where data already aligns:
   - `claims.policy_id` → `customer_products(id)`
   - `claims.client_lead_id` → `leads(id)`
   - `customer_products.agent_id` → `agents_profile(id)`
2. Add link columns + FKs:
   - `renewals.customer_product_id uuid REFERENCES customer_products(id)`
   - `policy_transactions.customer_id uuid REFERENCES customers(id)`
   - `policy_transactions.customer_product_id uuid REFERENCES customer_products(id)`
   - `call_logs.customer_id uuid REFERENCES customers(id)`
   - `whatsapp_logs.customer_id`, `whatsapp_logs.campaign_id`
   - `sms_logs.customer_id`, `sms_logs.campaign_id`
3. Backfill scripts (idempotent UPDATE…FROM):
   - `policy_transactions.customer_id` from `customers.mobile = client_phone` (same company)
   - `call_logs.customer_id` from `leads.customer_id`
   - `renewals.customer_product_id` from `customer_products.policy_no = renewals.policy_number`
4. Helper view `v_customer_360` joining customer + products + renewals + claims + recent calls/messages (security_invoker, scoped by `user_company_id()`).
5. Indexes on every new FK column.

### Phase 2 — UI / code fixes
- **Customer 360**: add **Unified Timeline tab** (calls, WhatsApp, SMS, claims, renewals, products) using `v_customer_360`.
- **Claims panel**: join `customer_products` on `policy_id`, show policy_no / insurer / premium inline.
- **Renewals queue**: when `customer_product_id` exists, link to the policy and show last claim status.
- **Reports Hub**: new **Funnel widget** (Lead → Calls → Followups → Won) + **Customer LTV widget** (premium sum − claims).
- **AdminSidebar**: ensure nav links exist for the funnel report (currently missing).

### Phase 3 — Final report
After applying, I'll run the same audit queries and produce a Fixed / Remaining / Recommendations report inline.

---

## Technical details
- All FKs use `ON DELETE SET NULL` so no historical row is destroyed.
- Backfills run inside the migration in a transaction; if any check fails the migration rolls back.
- New columns are nullable so existing inserts keep working; app code is updated to populate them on new writes (leads→customer conversion trigger already handles renewal creation — I'll extend it to set the new link).
- RLS: new columns inherit existing company-scoped policies; no policy changes required for `claims`, `customer_products`, `call_logs`. New `whatsapp_logs/sms_logs.customer_id` is read-permitted via existing company policies.
- The `v_customer_360` view uses `WITH (security_invoker=on)` so RLS on base tables is respected.

Approve and I'll ship Phase 1 (migration) first, then Phase 2 (UI) in the same turn after the migration is approved.