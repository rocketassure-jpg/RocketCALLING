# Customer Portfolio Management Platform — Plan  
  
  
  
sirf jo customer bn gaye he usme hi matlb crmm me leads bhii hone or converted customer bhii me hi ye update karna he baki 

This is a large transformation. I'll ship it in **3 phases** so each phase is reviewable, data-safe and visibly working before the next.

The good news: the audit I ran earlier already proved the foundation is in place.

- `customers` is already the central entity (12 rows, zero orphans).
- `customer_products` exists for multi-product portfolios.
- `customer_documents`, `call_logs`, `whatsapp_logs`, `sms_logs`, `renewals`, `claims`, `policy_transactions` all link (or were just linked) to `customer_id`.
- The unified `v_customer_360` view + `v_customer_timeline` view are already live.
- Lead → Customer conversion trigger exists and now also links renewals to the policy row.

So most of the **schema** for "one customer, many products" is already there. The remaining work is the **missing pieces** + UI surfacing.

---

## Phase 1 — Schema gaps (one migration, preserves all data)

New tables (all company-scoped, RLS + GRANTs):

1. `customer_family_members` — name, dob, gender, relation (spouse/son/daughter/father/mother/dependent), mobile, is_dependent.
2. `customer_contacts` — for business customers: name, designation, mobile, email, is_primary.
3. `customer_lifecycle_events` — append-only log: stage (lead/prospect/customer/policy_holder/multi_product/renewal/claim/loyal), occurred_at, source_id, notes. Auto-populated by triggers when a lead converts, a product is added, a renewal succeeds, a claim is filed.
4. `customer_tasks` — task_type, due_at, assigned_to, status, customer_id, related_product_id.
5. `customer_notes` — already partially covered by `lead_notes`; add `customer_notes` with `customer_id` so notes survive past the lead.
6. `cross_sell_suggestions` — generated view + cache table (customer_id, missing_category, score, reason).

Add columns to `customers`:

- `alternate_mobile`, `dob`, `gender`, `pan`, `aadhaar`, `address`, `state`, `pincode` (some may already exist — migration is idempotent with `ADD COLUMN IF NOT EXISTS`).
- `company_name`, `gst_number`, `industry`, `designation`, `customer_since` (default created_at).
- `value_score` numeric (computed nightly or on write).
- `lifecycle_stage` text — current stage, updated by trigger.

Add columns to `customer_products` (already supports motor/health/life/rto/finance via `category` + JSON details):

- Confirm `details jsonb` exists for product-specific fields (vehicle_no, idv, sum_insured, members_covered, nominee, loan_tenure, interest_rate, etc.). If not, add it.

Extend `v_customer_360` to include: family count, contacts count, lifecycle stage, value score, missing-product list.

Update `lead_to_customer_on_won()` trigger to also insert into `customer_lifecycle_events`.

---

## Phase 2 — Customer 360 UI overhaul

Rebuild `Customer360Panel` and `CustomerProfileDialog` as **the** central screen:

Tabs in one screen:

- **Overview** — personal + business details, lifecycle stage, value score, cross-sell opportunities.
- **Family** — table + add/edit family members, simple family-tree visual.
- **Portfolio** — all `customer_products` grouped by category (Insurance / Financial), dynamic per-category fields.
- **Claims** — list + Claim360Dialog (already exists).
- **Renewals** — bucketed (60/30/15/7/Expired) with Call/WhatsApp/SMS/Quote actions.
- **Documents** — upload + tag by product (storage bucket `customer-docs` already exists).
- **Payments & Commissions** — `policy_transactions` joined to products.
- **Communications** — unified timeline (already built via `v_customer_timeline`).
- **Tasks & Notes** — `customer_tasks` + `customer_notes`.

New components:

- `FamilyMembersTab.tsx`, `CustomerContactsTab.tsx`, `CrossSellWidget.tsx`, `LifecycleBadge.tsx`, `CustomerTasksTab.tsx`, `CustomerDocumentsTab.tsx`.

Dynamic product form: extend `AddProductDialog` to render fields based on selected category (motor → vehicle no/IDV/expiry; health → sum insured/members/PED; life → nominee/sum assured/term; loan → amount/tenure/rate).

---

## Phase 3 — Cross-sell + Reports + Automation hooks

- **Cross-sell engine**: SQL function `compute_cross_sell(_customer_id)` returns missing categories with a priority score. Surfaced in Customer 360 + a new "Cross-Sell" report.
- **Reports Hub**: add Customer Portfolio report, Cross-Sell report (already have Renewal/Claim/Revenue/Agent).
- **Automation**: extend existing `renewal-reminders` edge function pattern with `customer-automations` function (welcome message on customer creation, payment reminders, cross-sell campaigns). I will wire the DB-side triggers and the function skeleton; the actual message-template setup uses the existing `message_templates` + `send-whatsapp` / `send-sms` functions.

---

## Out of scope for this round (will list in final report as recommendations)

- Family-tree drag-and-drop visual editor (table view ships in P2; tree visual deferred).
- AI-powered value score (ships as a deterministic formula: premium sum + claim-free bonus + tenure; ML version deferred).
- Real-time payment gateway integration.

---

## Technical notes

- All new FKs use `ON DELETE CASCADE` from customer-children (family, contacts, tasks, notes) and `ON DELETE SET NULL` from lifecycle/products.
- All new tables get RLS scoped via `user_company_id()` and explicit GRANTs to `authenticated` + `service_role`.
- Migration is wrapped so failures roll back; existing data is untouched (`ADD COLUMN IF NOT EXISTS`, idempotent backfills).
- After Phase 1 migration runs, Supabase types regenerate, then Phase 2 UI is written against the new types.

---

## Delivery order

1. **Now**: Phase 1 migration (you approve it). Once it runs, I'll write Phase 2 UI in the same turn.
2. **Next turn**: Phase 3 cross-sell engine + reports + automation wiring.
3. **Final**: implementation report (modules added, tables modified, relationships created, issues fixed, recommendations).

Approve and I'll ship Phase 1.