
-- 1) Extend vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS irda_license_no text,
  ADD COLUMN IF NOT EXISTS irda_expiry_date date,
  ADD COLUMN IF NOT EXISTS agreement_start_date date,
  ADD COLUMN IF NOT EXISTS agreement_end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage';

-- 2) vendor_products
CREATE TABLE IF NOT EXISTS public.vendor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_category text NOT NULL,
  product_name text NOT NULL,
  default_commission_pct numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_category, product_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_products TO authenticated;
GRANT ALL ON public.vendor_products TO service_role;
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vp_read" ON public.vendor_products;
CREATE POLICY "vp_read" ON public.vendor_products FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "vp_write" ON public.vendor_products;
CREATE POLICY "vp_write" ON public.vendor_products FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));
DROP TRIGGER IF EXISTS trg_vp_updated ON public.vendor_products;
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.vendor_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) vendor_commissions
CREATE TABLE IF NOT EXISTS public.vendor_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_category text NOT NULL,
  product_name text,
  commission_type text NOT NULL DEFAULT 'percentage', -- percentage|fixed|slab|od_tp_split
  rate numeric DEFAULT 0,
  fixed_amount numeric DEFAULT 0,
  slab_min numeric,
  slab_max numeric,
  od_rate numeric,
  tp_rate numeric,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_commissions TO authenticated;
GRANT ALL ON public.vendor_commissions TO service_role;
ALTER TABLE public.vendor_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vc_read" ON public.vendor_commissions;
CREATE POLICY "vc_read" ON public.vendor_commissions FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "vc_write" ON public.vendor_commissions;
CREATE POLICY "vc_write" ON public.vendor_commissions FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));
DROP TRIGGER IF EXISTS trg_vc_updated ON public.vendor_commissions;
CREATE TRIGGER trg_vc_updated BEFORE UPDATE ON public.vendor_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) vendor_documents
CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  doc_type text NOT NULL, -- agreement|gst|pan|irda_license|commission_sheet|rate_card|other
  doc_name text,
  file_url text,
  expiry_date date,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_documents TO authenticated;
GRANT ALL ON public.vendor_documents TO service_role;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vd_read" ON public.vendor_documents;
CREATE POLICY "vd_read" ON public.vendor_documents FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "vd_write" ON public.vendor_documents;
CREATE POLICY "vd_write" ON public.vendor_documents FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));
DROP TRIGGER IF EXISTS trg_vd_updated ON public.vendor_documents;
CREATE TRIGGER trg_vd_updated BEFORE UPDATE ON public.vendor_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) vendor_ratings
CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_support int CHECK (claim_support BETWEEN 1 AND 5),
  pricing int CHECK (pricing BETWEEN 1 AND 5),
  service int CHECK (service BETWEEN 1 AND 5),
  turnaround int CHECK (turnaround BETWEEN 1 AND 5),
  overall numeric GENERATED ALWAYS AS (((COALESCE(claim_support,0)+COALESCE(pricing,0)+COALESCE(service,0)+COALESCE(turnaround,0))::numeric / NULLIF((CASE WHEN claim_support IS NOT NULL THEN 1 ELSE 0 END)+(CASE WHEN pricing IS NOT NULL THEN 1 ELSE 0 END)+(CASE WHEN service IS NOT NULL THEN 1 ELSE 0 END)+(CASE WHEN turnaround IS NOT NULL THEN 1 ELSE 0 END),0))) STORED,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, rated_by)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_ratings TO authenticated;
GRANT ALL ON public.vendor_ratings TO service_role;
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vr_read" ON public.vendor_ratings;
CREATE POLICY "vr_read" ON public.vendor_ratings FOR SELECT TO authenticated USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "vr_own_write" ON public.vendor_ratings;
CREATE POLICY "vr_own_write" ON public.vendor_ratings FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND rated_by = auth.uid())
  WITH CHECK (company_id = public.user_company_id() AND rated_by = auth.uid());
DROP TRIGGER IF EXISTS trg_vr_updated ON public.vendor_ratings;
CREATE TRIGGER trg_vr_updated BEFORE UPDATE ON public.vendor_ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Extend seed function with new vendor types (POSP/Corporate Agent/DSA/Surveyor/TPA examples)
CREATE OR REPLACE FUNCTION public.seed_master_data(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  -- Insurance companies
  FOR rec IN SELECT * FROM (VALUES
    ('LIC','life'),('HDFC Life','life'),('ICICI Prudential Life','life'),('SBI Life','life'),
    ('Max Life','life'),('Bajaj Allianz Life','life'),('Tata AIA Life','life'),('Aditya Birla Sun Life','life'),
    ('Kotak Life','life'),('PNB MetLife','life'),('Canara HSBC Life','life'),('Reliance Nippon Life','life'),
    ('IndiaFirst Life','life'),('Bandhan Life','life'),('Ageas Federal Life','life'),
    ('Future Generali Life','life'),('Shriram Life','life'),('Edelweiss Tokio Life','life'),
    ('Star Health','health'),('Care Health','health'),('Niva Bupa','health'),('ManipalCigna','health'),
    ('Aditya Birla Health','health'),('HDFC Ergo Health','health'),('ICICI Lombard Health','health'),
    ('Tata AIG Health','health'),('Bajaj Allianz Health','health'),('Future Generali Health','health'),
    ('Reliance Health','health'),
    ('ICICI Lombard','motor'),('HDFC Ergo','motor'),('Bajaj Allianz','motor'),('Tata AIG','motor'),
    ('Reliance General','motor'),('Future Generali','motor'),('Digit Insurance','motor'),('Acko','motor'),
    ('Royal Sundaram','motor'),('Kotak General','motor'),('Liberty General','motor'),('IFFCO Tokio','motor'),
    ('SBI General','motor'),('Universal Sompo','motor'),('Magma HDI','motor'),('Cholamandalam MS','motor'),
    ('National Insurance','general'),('New India Assurance','general'),('United India Insurance','general'),
    ('Oriental Insurance','general')
  ) AS t(name, category) LOOP
    INSERT INTO public.insurers (company_id, name, category, is_active, payout_cycle, tds_rate, gst_applicable)
    VALUES (_company_id, rec.name, rec.category, true, 'monthly', 5, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Vendors (broader set with all the new types)
  FOR rec IN SELECT * FROM (VALUES
    -- Brokers / POSP / Aggregators
    ('Policybazaar','aggregator'),('Turtlemint','aggregator'),('PB Partners','posp'),
    ('InsuranceDekho','aggregator'),('RenewBuy','aggregator'),('Coverfox','aggregator'),
    ('Bima Sugam','aggregator'),('Square Insurance','broker'),('Prudent Insurance','broker'),
    ('Anand Rathi Insurance','broker'),('Marsh India','broker'),('Aon India','broker'),('Howden India','broker'),
    -- Corporate Agents / DSAs (templates)
    ('Corporate Agent Network','corporate_agent'),('DSA Network','dsa'),
    -- Banks
    ('HDFC Bank','finance_bank'),('ICICI Bank','finance_bank'),('Axis Bank','finance_bank'),('SBI','finance_bank'),
    ('Kotak Mahindra Bank','finance_bank'),('IndusInd Bank','finance_bank'),('Bank of Baroda','finance_bank'),
    ('Punjab National Bank','finance_bank'),('Canara Bank','finance_bank'),('IDFC First Bank','finance_bank'),
    -- NBFC
    ('Bajaj Finance','finance_nbfc'),('Shriram Finance','finance_nbfc'),('Mahindra Finance','finance_nbfc'),
    ('Tata Capital','finance_nbfc'),('L&T Finance','finance_nbfc'),('Muthoot Finance','finance_nbfc'),
    ('Hero FinCorp','finance_nbfc'),('Cholamandalam Finance','finance_nbfc'),
    -- RTO
    ('State RTO','rto'),('MP Online','rto'),('CSC','rto'),('Authorized RTO Agent','rto'),('Transport Consultant','rto'),
    -- Surveyors / TPAs
    ('IRDA Surveyor (General)','surveyor'),('MD India TPA','tpa'),('Medi Assist TPA','tpa'),
    ('Family Health Plan TPA','tpa'),('Paramount TPA','tpa')
  ) AS t(name, vendor_type) LOOP
    INSERT INTO public.vendors (company_id, name, vendor_type, status, is_active)
    VALUES (_company_id, rec.name, rec.vendor_type, 'active', true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Product catalog (unchanged set)
  FOR rec IN SELECT * FROM (VALUES
    ('motor','Private Car'),('motor','Two Wheeler'),('motor','Commercial Vehicle'),('motor','Taxi'),
    ('motor','School Bus'),('motor','Passenger Vehicle'),('motor','Tractor'),('motor','Ambulance'),('motor','Electric Vehicle'),
    ('health','Individual Health'),('health','Family Floater'),('health','Senior Citizen'),
    ('health','Critical Illness'),('health','Group Health'),('health','Personal Accident'),
    ('health','Top Up'),('health','Super Top Up'),
    ('life','Term Insurance'),('life','ULIP'),('life','Endowment'),('life','Money Back'),
    ('life','Whole Life'),('life','Child Plan'),('life','Retirement Plan'),('life','Pension Plan'),
    ('fire','Residential Fire'),('fire','Commercial Fire'),('fire','Industrial Fire'),
    ('marine','Marine Cargo'),('marine','Marine Transit'),('marine','Marine Hull'),('marine','Import Export Cargo'),
    ('shopkeeper','Retail Shop'),('shopkeeper','Medical Store'),('shopkeeper','Mobile Shop'),
    ('shopkeeper','Grocery Shop'),('shopkeeper','Restaurant'),('shopkeeper','Showroom'),
    ('liability','Professional Liability'),('liability','Public Liability'),
    ('liability','Directors Liability'),('liability','Cyber Liability'),
    ('rto','New Registration'),('rto','RC Transfer'),('rto','Duplicate RC'),('rto','NOC'),
    ('rto','Fitness'),('rto','Permit'),('rto','Hypothecation'),('rto','Address Change'),('rto','License Services'),
    ('finance','Car Loan'),('finance','Bike Loan'),('finance','Used Car Loan'),('finance','Commercial Vehicle Loan'),
    ('finance','Business Loan'),('finance','Personal Loan'),('finance','Home Loan'),('finance','Loan Against Property')
  ) AS t(category, name) LOOP
    INSERT INTO public.product_catalog (company_id, category, name, is_active)
    VALUES (_company_id, rec.category, rec.name, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Re-seed all companies to pick up new vendor types
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_master_data(c.id);
  END LOOP;
END $$;
