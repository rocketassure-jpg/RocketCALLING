
-- 1) vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor_type text NOT NULL, -- broker|pos|aggregator|finance_bank|finance_nbfc|rto
  category text,
  contact_person text,
  contact_phone text,
  contact_email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vendor_type, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_company_read" ON public.vendors;
CREATE POLICY "vendors_company_read" ON public.vendors FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "vendors_admin_write" ON public.vendors;
CREATE POLICY "vendors_admin_write" ON public.vendors FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

DROP TRIGGER IF EXISTS trg_vendors_updated ON public.vendors;
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) product_catalog table
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL, -- motor|health|life|fire|marine|shopkeeper|liability|rto|finance
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, category, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_catalog TO authenticated;
GRANT ALL ON public.product_catalog TO service_role;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_company_read" ON public.product_catalog;
CREATE POLICY "products_company_read" ON public.product_catalog FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
DROP POLICY IF EXISTS "products_admin_write" ON public.product_catalog;
CREATE POLICY "products_admin_write" ON public.product_catalog FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

DROP TRIGGER IF EXISTS trg_products_updated ON public.product_catalog;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Seed function
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
    -- Life
    ('LIC','life'),('HDFC Life','life'),('ICICI Prudential Life','life'),('SBI Life','life'),
    ('Max Life','life'),('Bajaj Allianz Life','life'),('Tata AIA Life','life'),('Aditya Birla Sun Life','life'),
    ('Kotak Life','life'),('PNB MetLife','life'),('Canara HSBC Life','life'),('Reliance Nippon Life','life'),
    ('IndiaFirst Life','life'),('Bandhan Life','life'),('Ageas Federal Life','life'),
    ('Future Generali Life','life'),('Shriram Life','life'),('Edelweiss Tokio Life','life'),
    -- Health
    ('Star Health','health'),('Care Health','health'),('Niva Bupa','health'),('ManipalCigna','health'),
    ('Aditya Birla Health','health'),('HDFC Ergo Health','health'),('ICICI Lombard Health','health'),
    ('Tata AIG Health','health'),('Bajaj Allianz Health','health'),('Future Generali Health','health'),
    ('Reliance Health','health'),
    -- Motor & General
    ('ICICI Lombard','motor'),('HDFC Ergo','motor'),('Bajaj Allianz','motor'),('Tata AIG','motor'),
    ('Reliance General','motor'),('Future Generali','motor'),('Digit Insurance','motor'),('Acko','motor'),
    ('Royal Sundaram','motor'),('Kotak General','motor'),('Liberty General','motor'),('IFFCO Tokio','motor'),
    ('SBI General','motor'),('Universal Sompo','motor'),('Magma HDI','motor'),('Cholamandalam MS','motor'),
    -- PSU Generals (multi)
    ('National Insurance','general'),('New India Assurance','general'),('United India Insurance','general'),
    ('Oriental Insurance','general')
  ) AS t(name, category) LOOP
    INSERT INTO public.insurers (company_id, name, category, is_active, payout_cycle, tds_rate, gst_applicable)
    VALUES (_company_id, rec.name, rec.category, true, 'monthly', 5, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Vendors
  FOR rec IN SELECT * FROM (VALUES
    -- Brokers / POS / Aggregators
    ('Policybazaar','aggregator'),('Turtlemint','aggregator'),('PB Partners','aggregator'),
    ('InsuranceDekho','aggregator'),('RenewBuy','aggregator'),('Coverfox','aggregator'),
    ('Bima Sugam','aggregator'),('Square Insurance','broker'),('Prudent Insurance','broker'),
    ('Anand Rathi Insurance','broker'),('Marsh India','broker'),('Aon India','broker'),('Howden India','broker'),
    -- Banks
    ('HDFC Bank','finance_bank'),('ICICI Bank','finance_bank'),('Axis Bank','finance_bank'),('SBI','finance_bank'),
    ('Kotak Mahindra Bank','finance_bank'),('IndusInd Bank','finance_bank'),('Bank of Baroda','finance_bank'),
    ('Punjab National Bank','finance_bank'),('Canara Bank','finance_bank'),('IDFC First Bank','finance_bank'),
    -- NBFC
    ('Bajaj Finance','finance_nbfc'),('Shriram Finance','finance_nbfc'),('Mahindra Finance','finance_nbfc'),
    ('Tata Capital','finance_nbfc'),('L&T Finance','finance_nbfc'),('Muthoot Finance','finance_nbfc'),
    ('Hero FinCorp','finance_nbfc'),('Cholamandalam Finance','finance_nbfc'),
    -- RTO
    ('State RTO','rto'),('MP Online','rto'),('CSC','rto'),('Authorized RTO Agent','rto'),('Transport Consultant','rto')
  ) AS t(name, vendor_type) LOOP
    INSERT INTO public.vendors (company_id, name, vendor_type, is_active)
    VALUES (_company_id, rec.name, rec.vendor_type, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Product catalog
  FOR rec IN SELECT * FROM (VALUES
    -- Motor
    ('motor','Private Car'),('motor','Two Wheeler'),('motor','Commercial Vehicle'),('motor','Taxi'),
    ('motor','School Bus'),('motor','Passenger Vehicle'),('motor','Tractor'),('motor','Ambulance'),('motor','Electric Vehicle'),
    -- Health
    ('health','Individual Health'),('health','Family Floater'),('health','Senior Citizen'),
    ('health','Critical Illness'),('health','Group Health'),('health','Personal Accident'),
    ('health','Top Up'),('health','Super Top Up'),
    -- Life
    ('life','Term Insurance'),('life','ULIP'),('life','Endowment'),('life','Money Back'),
    ('life','Whole Life'),('life','Child Plan'),('life','Retirement Plan'),('life','Pension Plan'),
    -- Fire
    ('fire','Residential Fire'),('fire','Commercial Fire'),('fire','Industrial Fire'),
    -- Marine
    ('marine','Marine Cargo'),('marine','Marine Transit'),('marine','Marine Hull'),('marine','Import Export Cargo'),
    -- Shopkeeper
    ('shopkeeper','Retail Shop'),('shopkeeper','Medical Store'),('shopkeeper','Mobile Shop'),
    ('shopkeeper','Grocery Shop'),('shopkeeper','Restaurant'),('shopkeeper','Showroom'),
    -- Liability
    ('liability','Professional Liability'),('liability','Public Liability'),
    ('liability','Directors Liability'),('liability','Cyber Liability'),
    -- RTO
    ('rto','New Registration'),('rto','RC Transfer'),('rto','Duplicate RC'),('rto','NOC'),
    ('rto','Fitness'),('rto','Permit'),('rto','Hypothecation'),('rto','Address Change'),('rto','License Services'),
    -- Finance
    ('finance','Car Loan'),('finance','Bike Loan'),('finance','Used Car Loan'),('finance','Commercial Vehicle Loan'),
    ('finance','Business Loan'),('finance','Personal Loan'),('finance','Home Loan'),('finance','Loan Against Property')
  ) AS t(category, name) LOOP
    INSERT INTO public.product_catalog (company_id, category, name, is_active)
    VALUES (_company_id, rec.category, rec.name, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Seed all existing companies now
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_master_data(c.id);
  END LOOP;
END $$;

-- Auto-seed new companies
CREATE OR REPLACE FUNCTION public.trg_seed_master_data_on_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_master_data(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_master_on_company ON public.companies;
CREATE TRIGGER trg_seed_master_on_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_master_data_on_company();
