## Part A — Admin Sidebar: Compact + Reorganize

### A1. HamburgerMenu.tsx — sizing pass
- Container: `p-3 → p-2`, `space-y-3 → space-y-1.5` between groups
- Group heading: `pb-1 → pb-0.5`, keep `text-[10px] uppercase` (already compact)
- Each nav button: `min-h-[40px] → min-h-[30px]`, `py-2 → py-1`, `text-sm → text-xs`, `gap-3 → gap-2`
- Icon: `h-4 w-4 → h-3.5 w-3.5`
- Add support for a per-item `badge?: number` (small rounded chip on the right) — used for Team & Pending Approvals count
- Add support for `collapsibleGroups?: string[]` (default closed). Render those groups with an Accordion-style toggle (chevron). Non-collapsible groups stay always expanded.
- Add optional `subText?: ReactNode` on items (small muted line under label) — used for company name under Customers.

### A2. AdminDashboard.tsx — BASE_NAV restructure
New order + groups:

```text
DASHBOARDS    : overview, reports_hub
SALES         : calling, leads_hub, customers_hub (subText = company name)
POLICIES      : motor, health, life, rto, renewals, claims
FINANCE       : accounts, brokers, operations, branches, areas, team_approvals (merged)
TOOLS         : import, messaging, marketing, calculator, training
SETTINGS (collapsible, default closed):
   account, general_advance (combined), permissions, fields
CALL SETTINGS (collapsible, default closed):
   trash
```

- Remove standalone `team`, `approvals`, `api`, `settings`, `audit` ids.
- Add new id `team_approvals` → renders a 2-tab panel: existing Team UI (already inline in AdminDashboard for `team`) + `<PendingApprovalsPanel />`. Pending count badge fetched once (`select count from profiles where is_approved=false and company_id=user_company`).
- Add new id `general_advance` → renders Tabs: "General" (`<GeneralSettings/>`) | "API & Webhooks" (`<ApiAndWebhooksPanel/>`) | "Audit Logs" (`<AuditLogViewer/>`).
- Update the `section === "team"` / `"approvals"` / `"api"` / `"settings"` / `"audit"` render branches to point to the new merged sections (and remove the old branches).
- Company name fetch: reuse the same query AdminOverviewPanel uses (companies row by `companyId`). Lift to AdminDashboard or do a small `useEffect` and pass to HamburgerMenu via the `customers_hub` item's `subText`.

### A3. HamburgerMenu rendering changes
- Accept `collapsibleGroups: ["Settings", "Call Settings"]`.
- For each group, if collapsible: render a button row (group label + chevron) that toggles a local `openGroups` state Set; default both closed.
- Render `badge` as `<span className="ml-auto rounded-full bg-primary/15 text-primary text-[10px] px-1.5">{n}</span>`.

---

## Part B — Reports Hub: 5 Categories

### B1. New file: `src/components/admin/reports/ReportsHubPanel.tsx`
(separate from existing `ReportsHubPanel` at `src/components/admin/ReportsHubPanel.tsx` — we'll replace that one's body to delegate here, or just rewrite it in place. **Decision: rewrite `src/components/admin/ReportsHubPanel.tsx` in place** since `AdminDashboard` already imports it for the `reports_hub` nav id.)

Top of panel:
- Global date-range selector: `7d / 30d / 90d / Custom` (Custom = two date inputs). State lifted, passed to every category as a prop.
- 5 top-level Tabs (shadcn `Tabs`):
  1. **Lead & Calling** (default)
  2. **Productivity & Agent**
  3. **Renewal & Pipeline**
  4. **Policy & Product**
  5. **Financial & Payouts**

Each tab body renders its report cards stacked, each card has: title, one-line description, chart (recharts), table, CSV export button (reuse `downloadCSV` helper from existing `ReportsPanel.tsx`, extract to `src/components/admin/reports/utils.ts`).

### B2. Reports → data sources
| # | Report | Tab | Source |
|---|---|---|---|
| 1 | Call Volume | Lead&Calling | `dial_logs` join `profiles` |
| 2 | Talk Time | Lead&Calling | `dial_logs.duration_seconds where connected` |
| 3 | Lead Conversion | Lead&Calling | `leads` group status (reuse funnel) |
| 4 | Disposal/Status | Lead&Calling | `leads.status` pie + filters telecaller/area |
| 5 | FCR | Productivity | `call_logs` count per lead, terminal status check |
| 6 | Agent Activity | Productivity | `break_logs` + derived from `dial_logs` first/last |
| 7 | Missed Follow-ups | Productivity | `leads.follow_up_date < today` and not terminal |
| 8 | Upcoming Renewals | Renewal | `leads.policy_expiry_date between today and +N`, N toggle |
| 9 | Renewal Conversion | Renewal | `leads` due + `policy_transactions` matched |
| 10 | Pipeline Velocity | Renewal | `leads.created_at` → min `call_logs.called_at` where status='Done' |
| 11 | Category-Wise Business | Policy&Product | `policy_transactions.policy_type` (reuse byProduct) |
| 12 | Vehicle Type (Motor) | Policy&Product | `leads where policy_type='Motor' group vehicle_type` (use `motor_policies` if richer) |
| 13 | Insurer Distribution | Policy&Product | `policy_transactions` group insurer (top 10) |
| 14 | Premium Collected | Financial | `policy_transactions.premium_amount` with Daily/Weekly/Monthly toggle |
| 15 | Broker & Payouts | Financial | `policy_transactions` group broker_id + join `brokers` |

Existing reports from `ReportsPanel.tsx` (premium trend, byProduct, funnel, claims, expenses, P&L, branch) are folded into the new categories — keep them rendered, no deletion.

### B3. PerformancePanel merge
- Inside **Productivity & Agent** tab, render `<PerformancePanel />` at the bottom as an additional card so nothing is lost.

### B4. `ReportsAndPerformancePanel.tsx`
- The old `"reports" | "performance"` toggle becomes unnecessary because the Reports Hub now encapsulates both. Replace its body with `<ReportsHubPanel />` so the existing route stays valid. Keep the file (used elsewhere if any).

### B5. CSV export
- Extract `downloadCSV` from existing `ReportsPanel.tsx` into a shared util `src/components/admin/reports/utils.ts` and import everywhere.

---

## Files touched
- **edit** `src/components/HamburgerMenu.tsx` (sizing, badge, subText, collapsible groups)
- **edit** `src/pages/AdminDashboard.tsx` (BASE_NAV reorder, merged sections team_approvals + general_advance, company name fetch + subText, render branches)
- **rewrite** `src/components/admin/ReportsHubPanel.tsx` (new 5-category structure)
- **new**   `src/components/admin/reports/utils.ts` (downloadCSV, rangeStart, fmtINR)
- **new**   `src/components/admin/reports/categories/LeadCallingReports.tsx`
- **new**   `src/components/admin/reports/categories/ProductivityReports.tsx`
- **new**   `src/components/admin/reports/categories/RenewalReports.tsx`
- **new**   `src/components/admin/reports/categories/PolicyProductReports.tsx`
- **new**   `src/components/admin/reports/categories/FinancialReports.tsx`
- **edit**  `src/components/admin/ReportsAndPerformancePanel.tsx` (delegate to ReportsHubPanel)

No database/schema changes. No edge function changes. Pure frontend reorganization + new queries against existing tables.

---

## Order of implementation
1. **Part A** first (sidebar) — small, isolated, user can verify navigation works.
2. **Part B** second (Reports Hub) — bigger, independent.

Confirm and I'll start with Part A.
