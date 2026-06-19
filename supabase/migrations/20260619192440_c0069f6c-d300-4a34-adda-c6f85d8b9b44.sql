
-- 1) Extend claims with all the new fields
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS surveyor_email text,
  ADD COLUMN IF NOT EXISTS surveyor_license text,
  ADD COLUMN IF NOT EXISTS survey_date date,
  ADD COLUMN IF NOT EXISTS survey_report_url text,
  ADD COLUMN IF NOT EXISTS survey_remarks text,
  ADD COLUMN IF NOT EXISTS garage_contact text,
  ADD COLUMN IF NOT EXISTS garage_address text,
  ADD COLUMN IF NOT EXISTS garage_cashless boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS garage_estimate numeric,
  ADD COLUMN IF NOT EXISTS garage_final_bill numeric,
  ADD COLUMN IF NOT EXISTS hospital_doctor text,
  ADD COLUMN IF NOT EXISTS admission_date date,
  ADD COLUMN IF NOT EXISTS discharge_date date,
  ADD COLUMN IF NOT EXISTS hospital_bill numeric,
  ADD COLUMN IF NOT EXISTS towing_provider text,
  ADD COLUMN IF NOT EXISTS towing_pickup text,
  ADD COLUMN IF NOT EXISTS towing_drop text,
  ADD COLUMN IF NOT EXISTS towing_cost numeric,
  ADD COLUMN IF NOT EXISTS towing_invoice_url text,
  ADD COLUMN IF NOT EXISTS authorized_person_name text,
  ADD COLUMN IF NOT EXISTS authorized_relation text,
  ADD COLUMN IF NOT EXISTS authorized_mobile text,
  ADD COLUMN IF NOT EXISTS authorized_email text,
  ADD COLUMN IF NOT EXISTS authorized_id_proof_url text,
  ADD COLUMN IF NOT EXISTS authorization_letter_url text,
  ADD COLUMN IF NOT EXISTS escalation_level int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS escalation_notes text;

-- 2) claim_notes (timeline)
CREATE TABLE IF NOT EXISTS public.claim_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_notes TO authenticated;
GRANT ALL ON public.claim_notes TO service_role;
ALTER TABLE public.claim_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cn_read" ON public.claim_notes;
CREATE POLICY "cn_read" ON public.claim_notes FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "cn_write" ON public.claim_notes;
CREATE POLICY "cn_write" ON public.claim_notes FOR ALL TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

-- 3) claim_followups
CREATE TABLE IF NOT EXISTS public.claim_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  followup_date timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'call', -- call|whatsapp|email|visit
  remarks text,
  next_followup_date timestamptz,
  is_done boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_followups TO authenticated;
GRANT ALL ON public.claim_followups TO service_role;
ALTER TABLE public.claim_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cf_read" ON public.claim_followups;
CREATE POLICY "cf_read" ON public.claim_followups FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "cf_write" ON public.claim_followups;
CREATE POLICY "cf_write" ON public.claim_followups FOR ALL TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());
DROP TRIGGER IF EXISTS trg_cf_updated ON public.claim_followups;
CREATE TRIGGER trg_cf_updated BEFORE UPDATE ON public.claim_followups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) claim_communications
CREATE TABLE IF NOT EXISTS public.claim_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  party_type text NOT NULL, -- customer|surveyor|insurance_company|garage|hospital|authorized_person
  party_name text,
  comm_at timestamptz NOT NULL DEFAULT now(),
  discussion text NOT NULL,
  next_action text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_communications TO authenticated;
GRANT ALL ON public.claim_communications TO service_role;
ALTER TABLE public.claim_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cc_read" ON public.claim_communications;
CREATE POLICY "cc_read" ON public.claim_communications FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "cc_write" ON public.claim_communications;
CREATE POLICY "cc_write" ON public.claim_communications FOR ALL TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

-- 5) claim_expenses
CREATE TABLE IF NOT EXISTS public.claim_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  category text NOT NULL, -- towing|courier|survey_fee|legal|misc
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_expenses TO authenticated;
GRANT ALL ON public.claim_expenses TO service_role;
ALTER TABLE public.claim_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ce_read" ON public.claim_expenses;
CREATE POLICY "ce_read" ON public.claim_expenses FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "ce_write" ON public.claim_expenses;
CREATE POLICY "ce_write" ON public.claim_expenses FOR ALL TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());
