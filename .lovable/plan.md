## Goal
Settings ke andar ek naya **"Organization & Compensation"** module banayenge jisme:
1. Branch/Master Manager → Manager → Employees (Telecaller, Field Agent, Claim Dept, Legal, Underwriter, etc.) ki full hierarchy admin manage kare
2. Har employee type ke liye **Salary + Incentive + Commission** rules set ho (month-wise versioned, jaise Payout Setup Engine me kiya)

---

## Location
Settings tab ke andar do naye sub-tabs:
- **Org Hierarchy** (BranchesPanel ko extend karke roles assignment)
- **Compensation Setup** (salary+incentive+commission per role)

---

## TAB 1 — Org Hierarchy

### Top section: Branch / Master Manager
- Multiple Branch/Master Managers (BM) — admin add/remove/edit
- Field: name, region/division, email, phone, branch_id
- Admin assigns existing user (from `profiles`) as BM ya naya invite karta hai

### Middle section: Managers (under each BM)
- Per BM multiple Managers
- Assignment: dropdown of users → set `manager_id` = BM's user id + role = manager
- Branch tag

### Bottom section: Employees (under each Manager)
- Employee types (designation): `telecaller`, `field_agent`, `claim_dept`, `legal`, `underwriter`, `other`
- Drag/dropdown assign to Manager (`manager_id`)
- Bulk reassign

### UI
- Tree view (collapsible) + list view toggle
- Search by name/role/branch
- Add Member dialog (reuse `EditMemberDialog` pattern) with new "designation" field

---

## TAB 2 — Compensation Setup

Per **designation** (BM, Manager, Telecaller, Field Agent, Claim Dept, Legal, Underwriter) configure:

| Field | Notes |
|---|---|
| Base Salary (₹/month) | Fixed monthly |
| Incentive Type | `per_policy` / `per_lead_won` / `percent_of_premium` / `slab_based` / `flat_monthly` |
| Incentive Value | Amount or % |
| Slabs (optional) | min–max → rate (for slab_based) |
| Commission % | For sales roles (telecaller, field agent, BM override) |
| Effective Month | Month-wise versioning (same pattern as PayoutSetupEngine) |
| Applies To | All / Specific Branch / Specific User |

Live preview calculator: "Agar telecaller 10 policies sells with ₹50k premium → salary + incentive + commission = ₹X"

Import/Export Excel (SheetJS) — same as Payout Setup Engine.

---

## Technical

### DB (1 migration)
1. **`employee_designations`** — company_id, key (enum-like text), label, sort_order
   - Seed: branch_manager, manager, telecaller, field_agent, claim_dept, legal, underwriter
2. **`compensation_rules`** — company_id, designation_key, branch_id (nullable), user_id (nullable), base_salary, incentive_type, incentive_value, commission_percent, slabs (jsonb), effective_month, notes, created_by
   - Index on (company_id, designation_key, effective_month DESC)
3. **Add to `profiles`**: `designation TEXT` column (nullable) — drives compensation lookup
4. **Add to `profiles`**: `branch_id` already exists ✓, `manager_id` already exists ✓

All tables: GRANT to authenticated + service_role, RLS = company admins + super admin manage; users see own row only.

### Frontend
- `src/components/admin/org/OrgHierarchyPanel.tsx` — tree + assignment UI
- `src/components/admin/org/CompensationSetup.tsx` — per-designation rules table + calculator + import/export
- Register both as Settings sub-tabs in `AdminDashboard.tsx`

### Out of scope (follow-up)
- Auto-payroll generation (just rules engine now; payroll run is next task)
- Payslip PDF
- Approval workflow for compensation changes

---

## Theme
Existing shadcn tokens only (`bg-card`, `border-border`, `Tabs`, `Card`, `Table`, `Badge`) — koi naya color nahi.

Confirm karein toh implement kar deta hoon.
