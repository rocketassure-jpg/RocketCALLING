# Plan — System upgrade (4 phases)

Aap ne sab 4 chuna, Partner = dono types, payout = full custom. Bohot bada scope hai isliye 4 phases me karenge — har phase ke baad aap test karke "next" bolenge.

---

## Phase 1 — Super Admin: Company Delete (safety-first)

**Goal:** Super admin kisi bhi company ko safely delete kar sake taki orphan kachra na bache.

**DB migration:**
- New RPC `super_admin_delete_company(_company_id uuid)` — SECURITY DEFINER, sirf `is_super_admin` ko allow.
- Function order: pehle dependent rows (leads, customers, customer_products, claims, renewals, policy_transactions, payouts, branches, profiles, user_roles, audit_logs, etc. — saare 100+ tables jinme `company_id` hai), phir companies row.
- Audit entry `super_admin_audit_log` me likhega "DELETE_COMPANY" with old data snapshot.
- Transaction-safe — koi error to full rollback.

**UI (`SuperAdminPanels.tsx` / Companies tab):**
- Har company row me red "Delete" icon.
- Confirm dialog 2-step: company ka exact name type karna mandatory + checkbox "I understand this is permanent".
- Loading state + toast.

---

## Phase 2 — Hierarchy: Owner → Partners → Branches → Agents

**Roles add:**
- `app_role` enum me add: `owner`, `partner`.
- `profiles` me: `partner_type` (`equity` | `regional` | null), `partner_share_pct numeric`.
- Branches already exist — add `partner_id uuid` (regional partner mapping, nullable).

**Org Hierarchy Panel** (`OrgHierarchyPanel.tsx` rewrite):
```text
[ Owner: Ramesh Kumar ]
   ├── Partner (equity 30%): Suresh
   ├── Partner (regional): Mahesh
   │     ├── Branch: Indore
   │     │     ├── Agent: Ravi (Motor 30%, Health 25%)
   │     │     └── Agent: Priya
   │     └── Branch: Bhopal
   └── Branch: Ujjain (no partner — direct under owner)
```
- Collapsible tree, drag-drop NOT included (phase 5 if needed).
- Add/Edit dialogs for each level.
- Auto-elevate first admin → owner on migration.

---

## Phase 3 — Custom Payout Engine

**DB:**
- `agent_payout_rules` table (per-agent override): agent_id, product_category, basis (`flat_pct` | `slab` | `fixed_amount` | `formula`), config jsonb, effective_from, effective_to.
- `payout_slabs` table: rule_id, min_amount, max_amount, rate_pct, fixed_bonus.
- `agent_payout_ledger`: monthly computed entries — agent_id, period_month, gross_commission, agent_share, branch_share, partner_share, owner_share, tds, net_payout, status (`pending`/`approved`/`paid`).

**Engine (DB function `compute_agent_payout(_agent_id, _month)`):**
- Reads `customer_products` + `policy_transactions` for the period.
- Resolves rule cascade: agent-specific > branch-default > company-default.
- Splits: agent → branch → partner (if regional) → owner. Configurable % per level.
- TDS auto (5% Sec 194D).
- Writes ledger row.

**UI:**
- `AgentPayoutRules.tsx` — per-agent rule builder with slab editor.
- `PayoutLedger.tsx` — monthly statement, filter by agent/branch/partner, approve+mark-paid, export CSV/PDF.
- Existing `AgentPayouts.tsx` extend ya merge.

**Research-backed defaults seeded:**
- Motor OD: 15% (IRDAI cap), Motor TP: 2.5%, Health: 15% renewal / 22.5% new, Life Term: 25% Y1 / 5% Y2-Y3, Life Endowment: 35% Y1.
- Aap baad me edit kar sakte ho.

---

## Phase 4 — Mobile-friendly polish

- `AdminSidebar` — desktop sidebar ke saath mobile Sheet drawer (hamburger top-left), bottom-nav already hai telecaller ke liye, admin ke liye bhi add.
- Saare tables — wrap in horizontal scroll container, key tables ko mobile pe card-view me convert (CustomersPanel, FinancePanel, PayoutLedger).
- Dialogs — `sm:max-w-X` ke saath `max-h-[95vh] overflow-y-auto`, mobile pe full-screen sheet.
- Touch targets — min 44px buttons, larger tap areas in lists.
- Sticky action bars on mobile.

---

## Technical notes

- Migrations approval-gated (aap har migration "yes" karoge).
- `types.ts` auto-regenerate hoga har migration ke baad.
- Backward compatible — purane roles (admin/manager/telecaller/sub_agent) chalte rahenge; owner/partner naye additions hain.
- No breaking changes to existing leads/customers flow.

---

**Start with Phase 1 (company delete)?** "haan phase 1 start karo" bolo to migration banata hu.