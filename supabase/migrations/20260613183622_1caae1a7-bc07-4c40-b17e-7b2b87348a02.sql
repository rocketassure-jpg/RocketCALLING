
-- RTO SERVICE TYPES (shared catalog)
CREATE TABLE public.rto_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,            -- license / registration / transfer / fitness_permit / hypothecation / address_change / duplicate / other / commercial
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_charges NUMERIC(10,2) DEFAULT 0,
  govt_fees NUMERIC(10,2) DEFAULT 0,
  service_charge NUMERIC(10,2) DEFAULT 0,
  default_documents JSONB DEFAULT '[]'::jsonb,
  estimated_days INT DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rto_service_types TO authenticated, anon;
GRANT ALL ON public.rto_service_types TO service_role;
ALTER TABLE public.rto_service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rto_service_types public read" ON public.rto_service_types FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "rto_service_types super admin write" ON public.rto_service_types FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- RTO CASES
CREATE TABLE public.rto_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  service_type_id UUID NOT NULL REFERENCES public.rto_service_types(id),
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  application_number TEXT,
  rto_office TEXT,
  status TEXT NOT NULL DEFAULT 'received',  -- received / docs_pending / submitted / under_process / approved / dispatched / completed / rejected / cancelled
  govt_fees NUMERIC(10,2) DEFAULT 0,
  service_charge NUMERIC(10,2) DEFAULT 0,
  total_charges NUMERIC(10,2) DEFAULT 0,
  amount_collected NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',     -- pending / partial / paid
  received_date DATE DEFAULT CURRENT_DATE,
  submitted_date DATE,
  expected_completion_date DATE,
  completed_date DATE,
  assigned_to UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rto_cases_company ON public.rto_cases(company_id);
CREATE INDEX idx_rto_cases_status ON public.rto_cases(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rto_cases TO authenticated;
GRANT ALL ON public.rto_cases TO service_role;
ALTER TABLE public.rto_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rto_cases company access" ON public.rto_cases FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_rto_cases_updated BEFORE UPDATE ON public.rto_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RTO CASE DOCUMENTS
CREATE TABLE public.rto_case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.rto_cases(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_collected BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  document_url TEXT,
  notes TEXT,
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rto_docs_case ON public.rto_case_documents(case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rto_case_documents TO authenticated;
GRANT ALL ON public.rto_case_documents TO service_role;
ALTER TABLE public.rto_case_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rto_docs company access" ON public.rto_case_documents FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());

-- RTO STATUS HISTORY
CREATE TABLE public.rto_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.rto_cases(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rto_history_case ON public.rto_status_history(case_id);
GRANT SELECT, INSERT ON public.rto_status_history TO authenticated;
GRANT ALL ON public.rto_status_history TO service_role;
ALTER TABLE public.rto_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rto_history company access" ON public.rto_status_history FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());

-- Trigger: auto-log status changes + auto-create document checklist on case creation
CREATE OR REPLACE FUNCTION public.rto_log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rto_status_history (company_id, case_id, from_status, to_status, changed_by)
    VALUES (NEW.company_id, NEW.id, NULL, NEW.status, NEW.created_by);
    -- seed documents from service type's default list
    INSERT INTO public.rto_case_documents (company_id, case_id, document_name, is_required)
    SELECT NEW.company_id, NEW.id, doc->>'name', COALESCE((doc->>'required')::boolean, true)
    FROM public.rto_service_types st, jsonb_array_elements(st.default_documents) doc
    WHERE st.id = NEW.service_type_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.rto_status_history (company_id, case_id, from_status, to_status, changed_by)
    VALUES (NEW.company_id, NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'completed' AND NEW.completed_date IS NULL THEN
      NEW.completed_date := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rto_log_status AFTER INSERT ON public.rto_cases
  FOR EACH ROW EXECUTE FUNCTION public.rto_log_status_change();
CREATE TRIGGER trg_rto_status_change BEFORE UPDATE ON public.rto_cases
  FOR EACH ROW EXECUTE FUNCTION public.rto_log_status_change();

-- Seed 30+ RTO service types
INSERT INTO public.rto_service_types (category, code, name, description, govt_fees, service_charge, estimated_days, default_documents) VALUES
-- License
('license','LL_NEW','Learner License (Fresh)','Fresh learner license application',350,500,3,'[{"name":"Aadhaar Card"},{"name":"Address Proof"},{"name":"DOB Proof"},{"name":"Passport Photo"},{"name":"Form 1"},{"name":"Form 2"}]'),
('license','DL_NEW','Driving License (Fresh)','Fresh permanent driving license',1200,1000,30,'[{"name":"Learner License"},{"name":"Aadhaar Card"},{"name":"Address Proof"},{"name":"Passport Photo"},{"name":"Form 4"}]'),
('license','DL_RENEW','DL Renewal','Driving license renewal',600,500,7,'[{"name":"Old DL"},{"name":"Aadhaar Card"},{"name":"Form 9"},{"name":"Medical Certificate"},{"name":"Passport Photo"}]'),
('license','DL_DUPLICATE','Duplicate DL','Duplicate driving license',400,500,15,'[{"name":"FIR Copy / Affidavit"},{"name":"Aadhaar Card"},{"name":"Form LLD"},{"name":"Passport Photo"}]'),
('license','DL_ADDRESS','DL Address Change','Change of address on DL',200,400,10,'[{"name":"Old DL"},{"name":"New Address Proof"},{"name":"Form 33"},{"name":"Passport Photo"}]'),
('license','DL_ADD_CLASS','Add Vehicle Class','Add new vehicle class to DL',1000,800,30,'[{"name":"Existing DL"},{"name":"Form 8"},{"name":"Medical Certificate"},{"name":"Passport Photo"}]'),
-- Registration
('registration','RC_NEW','New Vehicle Registration','First-time vehicle registration',800,1500,15,'[{"name":"Form 20"},{"name":"Form 21 (Invoice)"},{"name":"Form 22 (Roadworthiness)"},{"name":"Insurance Policy"},{"name":"PAN/Aadhaar"},{"name":"Address Proof"}]'),
('registration','RC_RENEWAL','RC Renewal','15-year RC renewal',900,1000,15,'[{"name":"Old RC"},{"name":"Form 25"},{"name":"PUC"},{"name":"Insurance"},{"name":"Fitness Certificate"}]'),
('registration','RC_DUPLICATE','Duplicate RC','Duplicate registration certificate',500,800,10,'[{"name":"FIR / Affidavit"},{"name":"Form 26"},{"name":"Insurance"},{"name":"PUC"}]'),
-- Transfer / hypothecation
('transfer','TRANSFER_OWNERSHIP','Ownership Transfer','Transfer ownership to new buyer',500,1500,21,'[{"name":"Form 29 (×2)"},{"name":"Form 30"},{"name":"Original RC"},{"name":"Seller PAN/Aadhaar"},{"name":"Buyer PAN/Aadhaar"},{"name":"Buyer Address Proof"},{"name":"Insurance"},{"name":"PUC"},{"name":"NOC (if outside RTO)"}]'),
('hypothecation','HP_ADD','Hypothecation Addition','Add HP / loan to RC',300,500,7,'[{"name":"Original RC"},{"name":"Form 34"},{"name":"Bank/NBFC Letter"},{"name":"Insurance"}]'),
('hypothecation','HP_TERMINATION','Hypothecation Termination','Remove HP after loan closure',200,500,7,'[{"name":"Original RC"},{"name":"Form 35"},{"name":"NOC from financier"},{"name":"Loan Closure Letter"}]'),
('hypothecation','HP_CONTINUATION','HP Continuation','Continue HP on renewed RC',200,400,7,'[{"name":"RC"},{"name":"Form 34"},{"name":"Financier NOC"}]'),
('transfer','NOC_ISSUE','NOC Issue','NOC for inter-state transfer',500,1000,15,'[{"name":"RC"},{"name":"Form 28 (×3)"},{"name":"Insurance"},{"name":"PUC"},{"name":"Police Clearance"}]'),
('transfer','RE_REGISTRATION','Re-Registration (Other State)','Re-register vehicle from other state',1500,2000,30,'[{"name":"Original RC"},{"name":"NOC from old RTO"},{"name":"Form 27"},{"name":"Form 20"},{"name":"Address Proof"},{"name":"Road Tax Receipt"},{"name":"Insurance"},{"name":"PUC"}]'),
-- Fitness / Permit
('fitness_permit','FC_NEW','Fitness Certificate (New)','Fitness certificate for commercial vehicle',600,500,3,'[{"name":"RC"},{"name":"Form 38"},{"name":"Insurance"},{"name":"PUC"},{"name":"Tax Receipt"}]'),
('fitness_permit','FC_RENEWAL','FC Renewal','Renewal of fitness certificate',600,500,3,'[{"name":"Old FC"},{"name":"RC"},{"name":"Insurance"},{"name":"PUC"},{"name":"Tax Receipt"}]'),
('fitness_permit','PERMIT_NEW','New Permit','Fresh commercial permit',1500,2000,15,'[{"name":"RC"},{"name":"Fitness Certificate"},{"name":"Insurance"},{"name":"Form PCA"},{"name":"Tax Receipt"}]'),
('fitness_permit','PERMIT_RENEWAL','Permit Renewal','Permit renewal',1200,1500,7,'[{"name":"Old Permit"},{"name":"RC"},{"name":"Fitness Certificate"},{"name":"Insurance"},{"name":"Tax Receipt"}]'),
('fitness_permit','PERMIT_NATIONAL','National Permit','National goods/passenger permit',5000,3000,30,'[{"name":"RC"},{"name":"FC"},{"name":"Insurance"},{"name":"State Permit"},{"name":"Tax Clearance"}]'),
-- Address / particulars
('address_change','RC_ADDRESS','RC Address Change','Change address on RC',300,500,10,'[{"name":"RC"},{"name":"New Address Proof"},{"name":"Form 33"}]'),
('address_change','OWNER_NAME_CHANGE','Owner Name Correction','Correct name spelling on RC',200,500,15,'[{"name":"RC"},{"name":"Aadhaar/PAN"},{"name":"Affidavit"}]'),
-- Tax
('other','ROAD_TAX_REFUND','Road Tax Refund','Refund of road tax (vehicle scrapped/transferred)',0,1000,45,'[{"name":"RC (cancelled)"},{"name":"Tax Paid Receipt"},{"name":"Form DT"},{"name":"Bank Details"}]'),
('other','GREEN_TAX','Green Tax Payment','Pay green tax for >15yr vehicles',0,300,1,'[{"name":"RC"},{"name":"PUC"}]'),
('other','TAX_TOKEN','Quarterly Tax Token','Commercial vehicle quarterly tax',0,300,1,'[{"name":"RC"},{"name":"Insurance"},{"name":"Fitness"}]'),
-- Duplicate / Misc
('duplicate','DUP_INSURANCE','Duplicate Insurance','Get duplicate insurance copy',0,200,3,'[{"name":"FIR/Affidavit"},{"name":"Old Policy No"}]'),
('other','PUC_NEW','PUC Certificate','Pollution under control test',60,150,1,'[{"name":"RC"}]'),
('other','VEHICLE_SCRAP','Vehicle Scrap Certificate','Certificate of deposit for scrapped vehicle',500,1500,30,'[{"name":"RC"},{"name":"Form CRV"},{"name":"Aadhaar"},{"name":"Insurance"}]'),
('other','NUMBER_PLATE','HSRP / Number Plate','High security number plate',400,300,15,'[{"name":"RC"},{"name":"Aadhaar"}]'),
('commercial','BADGE_NEW','Conductor/Driver Badge','Commercial driver badge',300,500,10,'[{"name":"DL"},{"name":"Police Verification"},{"name":"Medical Certificate"},{"name":"Aadhaar"},{"name":"Passport Photo"}]'),
('commercial','BADGE_RENEWAL','Badge Renewal','Renewal of commercial badge',200,400,7,'[{"name":"Old Badge"},{"name":"DL"},{"name":"Medical Certificate"}]'),
('other','INTERNATIONAL_PERMIT','International Driving Permit','IDP for foreign travel',1000,800,7,'[{"name":"DL"},{"name":"Passport"},{"name":"Visa"},{"name":"Form 4A"},{"name":"Medical Certificate"},{"name":"Passport Photo"}]')
ON CONFLICT (code) DO NOTHING;

-- Refresh total_charges default
UPDATE public.rto_service_types SET default_charges = govt_fees + service_charge;
