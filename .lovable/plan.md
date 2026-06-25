## Quotation Module

A new top-level module in Rocket CRM that owns the full pre-sale flow: **Vehicle → Quotes → WhatsApp → KYC → Payment → Convert to Policy**. PolicyBoss POSP is the backing provider, hidden from telecallers.

### What gets added

**1. Database (one migration)**
- `super_admin_integrations` — provider credentials/token (PolicyBoss POSP), super-admin only.
- `motor_quotes` — every generated quote (insurer, IDV, OD/TP/addon/net, status: generated → sent → kyc_done → payment_sent → converted).
- Extend existing `customer_documents` with `motor_quote_id` (table already exists; no recreate).
- `leads` += `latest_quote_id`, `kyc_status`, `payment_link`.
- RLS scoped to `company_id`; GRANTs for authenticated + service_role.

**2. Edge functions (`supabase/functions/`)**
- `policyboss-auth` — login/refresh, persists token.
- `fetch-vehicle-details` — VAHAN/PolicyBoss lookup, caches into `vehicles`.
- `policyboss-kyc-submit` — submits KYC, updates `kyc_status`.
- `generate-payment-link` — returns a payment URL (telecaller never sees gateway).

**3. Super Admin — Integrations**
- New `PolicyBossIntegrationPanel` (credentials, Connected/Disconnected badge, Test, last sync).
- New "Integrations" entry in Super Admin sidebar.
- `usePolicybossSession` hook for token refresh.

**4. Quotation Module UI (new folder `src/components/admin/quotation/`)**
- `QuotationPanel.tsx` — module home: list of quotes (filters: status, telecaller, date), KPI strip, "New Quote" button.
- `MotorQuoteWizard.tsx` — 5-step Sheet/Dialog:
  1. `VehicleInputStep` (reg no → fetch)
  2. `QuoteListStep` (multi-insurer cards, IDV slider, addon checkboxes, live recalc)
  3. `QuoteSendStep` (WhatsApp message preview + `wa.me` send)
  4. `KycStep` (PAN/Aadhaar/RC/DL uploads to Storage, submit to PolicyBoss)
  5. `PaymentStep` (single "Send Payment Link on WhatsApp" button — gateway hidden)
- Wizard persists progress to `motor_quotes` so it resumes on reopen.

**5. Wire-in points**
- Admin sidebar: new "Quotation" entry (between Leads and Renewals).
- `LeadActions.tsx` & `CallingList`: add "Motor Quote" button that opens the wizard pre-filled from the lead.
- On `status = converted` → auto-insert `motor_policies` row and update lead.

### Out of scope (for this pass)
- Health/Life quotation (module is built generically but only Motor flow is implemented now).
- Real PolicyBoss API contract testing — functions are wired with the documented endpoints; you may need to share sandbox credentials before live calls succeed.

### Technical notes
- Storage bucket `kyc-documents` (private, 5MB cap, jpg/png/pdf).
- Reuse addon math from `PremiumCalculator.tsx`.
- Mobile: `Sheet` (bottom); desktop: `Dialog` (large).
- All provider branding hidden from telecaller UI per spec.

### Delivery order
1. Migration + storage bucket (one approval).
2. Edge functions (4).
3. Super Admin PolicyBoss panel + session hook.
4. Quotation module UI + wizard.
5. Wire into Admin sidebar, LeadActions, CallingList.

Approve and I'll start with the migration.
