
-- 1) Super Admin integrations (PolicyBoss POSP credentials/token)
CREATE TABLE IF NOT EXISTS public.super_admin_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'disconnected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_integrations TO authenticated;
GRANT ALL ON public.super_admin_integrations TO service_role;

ALTER TABLE public.super_admin_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admins read integrations" ON public.super_admin_integrations;
CREATE POLICY "super admins read integrations" ON public.super_admin_integrations
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admins write integrations" ON public.super_admin_integrations;
CREATE POLICY "super admins write integrations" ON public.super_admin_integrations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_super_admin_integrations_updated ON public.super_admin_integrations;
CREATE TRIGGER trg_super_admin_integrations_updated
  BEFORE UPDATE ON public.super_admin_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2) Motor quotes table (quotation module backbone)
CREATE TABLE IF NOT EXISTS public.motor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  registration_number text NOT NULL,
  make text,
  model text,
  variant text,
  mfg_year int,
  fuel_type text,
  rto_code text,
  policy_type text NOT NULL DEFAULT 'new', -- new | renewal
  previous_insurer text,
  previous_expiry_date date,
  insurer_name text,
  insurer_code text,
  plan_type text NOT NULL DEFAULT 'comprehensive',
  idv numeric(12,2),
  od_premium numeric(12,2),
  tp_premium numeric(12,2),
  addon_premium numeric(12,2) DEFAULT 0,
  net_premium numeric(12,2),
  gst_amount numeric(12,2),
  gross_premium numeric(12,2),
  selected_addons jsonb DEFAULT '[]'::jsonb,
  policyboss_quote_id text,
  quote_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft | generated | sent | kyc_done | payment_sent | converted | lost
  current_step int NOT NULL DEFAULT 1,
  whatsapp_sent_at timestamptz,
  kyc_status text DEFAULT 'pending', -- pending | in_progress | verified | rejected
  kyc_pan text,
  kyc_aadhaar_last4 text,
  payment_link text,
  payment_sent_at timestamptz,
  payment_reference text,
  converted_policy_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.motor_quotes TO authenticated;
GRANT ALL ON public.motor_quotes TO service_role;

ALTER TABLE public.motor_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motor_quotes company read" ON public.motor_quotes;
CREATE POLICY "motor_quotes company read" ON public.motor_quotes
  FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "motor_quotes company write" ON public.motor_quotes;
CREATE POLICY "motor_quotes company write" ON public.motor_quotes
  FOR ALL TO authenticated
  USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_motor_quotes_lead ON public.motor_quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_motor_quotes_customer ON public.motor_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_motor_quotes_status ON public.motor_quotes(status);
CREATE INDEX IF NOT EXISTS idx_motor_quotes_created_at ON public.motor_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_motor_quotes_company ON public.motor_quotes(company_id);

DROP TRIGGER IF EXISTS trg_motor_quotes_updated ON public.motor_quotes;
CREATE TRIGGER trg_motor_quotes_updated
  BEFORE UPDATE ON public.motor_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3) Extend customer_documents to optionally link to a motor quote
ALTER TABLE public.customer_documents
  ADD COLUMN IF NOT EXISTS motor_quote_id uuid REFERENCES public.motor_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_documents_motor_quote ON public.customer_documents(motor_quote_id);


-- 4) Extend leads with quotation-related fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS latest_quote_id uuid REFERENCES public.motor_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_link text;
