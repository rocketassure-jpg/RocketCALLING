
-- VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  vehicle_type TEXT,
  make TEXT,
  model TEXT,
  variant TEXT,
  manufacturing_year INT,
  registration_date DATE,
  fuel_type TEXT,
  cubic_capacity INT,
  seating_capacity INT,
  chassis_number TEXT,
  engine_number TEXT,
  color TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  rto_code TEXT,
  hypothecation TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_company ON public.vehicles(company_id);
CREATE INDEX idx_vehicles_reg ON public.vehicles(registration_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles company access" ON public.vehicles FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MOTOR POLICIES
CREATE TABLE public.motor_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents_profile(id) ON DELETE SET NULL,
  policy_number TEXT,
  policy_type TEXT,              -- comprehensive / third_party / own_damage / standalone_od
  cover_type TEXT,               -- new / rollover / renewal
  issue_date DATE,
  start_date DATE,
  end_date DATE,
  od_start DATE,
  od_end DATE,
  tp_start DATE,
  tp_end DATE,
  idv NUMERIC(14,2),
  ncb_percent NUMERIC(5,2),
  previous_policy_no TEXT,
  previous_insurer TEXT,
  od_premium NUMERIC(12,2) DEFAULT 0,
  tp_premium NUMERIC(12,2) DEFAULT 0,
  addon_premium NUMERIC(12,2) DEFAULT 0,
  net_premium NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  gross_premium NUMERIC(12,2) DEFAULT 0,
  addons JSONB DEFAULT '[]'::jsonb,
  payment_mode TEXT,
  payment_status TEXT,
  status TEXT DEFAULT 'active',  -- active / lapsed / cancelled / renewed
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_motor_policies_company ON public.motor_policies(company_id);
CREATE INDEX idx_motor_policies_vehicle ON public.motor_policies(vehicle_id);
CREATE INDEX idx_motor_policies_end ON public.motor_policies(end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motor_policies TO authenticated;
GRANT ALL ON public.motor_policies TO service_role;
ALTER TABLE public.motor_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motor_policies company access" ON public.motor_policies FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_motor_policies_updated BEFORE UPDATE ON public.motor_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PUC RECORDS
CREATE TABLE public.puc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  test_center TEXT,
  reading TEXT,
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_puc_company ON public.puc_records(company_id);
CREATE INDEX idx_puc_vehicle ON public.puc_records(vehicle_id);
CREATE INDEX idx_puc_expiry ON public.puc_records(expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puc_records TO authenticated;
GRANT ALL ON public.puc_records TO service_role;
ALTER TABLE public.puc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puc company access" ON public.puc_records FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_puc_updated BEFORE UPDATE ON public.puc_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FITNESS CERTIFICATES
CREATE TABLE public.fitness_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  rto_office TEXT,
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fc_company ON public.fitness_certificates(company_id);
CREATE INDEX idx_fc_vehicle ON public.fitness_certificates(vehicle_id);
CREATE INDEX idx_fc_expiry ON public.fitness_certificates(expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_certificates TO authenticated;
GRANT ALL ON public.fitness_certificates TO service_role;
ALTER TABLE public.fitness_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc company access" ON public.fitness_certificates FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_fc_updated BEFORE UPDATE ON public.fitness_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PERMITS
CREATE TABLE public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  permit_number TEXT,
  permit_type TEXT,            -- national / state / contract / tourist / goods
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  states_covered TEXT,
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_permits_company ON public.permits(company_id);
CREATE INDEX idx_permits_vehicle ON public.permits(vehicle_id);
CREATE INDEX idx_permits_expiry ON public.permits(expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permits TO authenticated;
GRANT ALL ON public.permits TO service_role;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permits company access" ON public.permits FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_permits_updated BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RC REGISTER
CREATE TABLE public.rc_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  rc_number TEXT,
  rc_issue_date DATE,
  rc_expiry_date DATE,
  owner_name TEXT,
  owner_address TEXT,
  rto_office TEXT,
  rc_status TEXT,              -- active / suspended / cancelled
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rc_company ON public.rc_register(company_id);
CREATE INDEX idx_rc_vehicle ON public.rc_register(vehicle_id);
CREATE INDEX idx_rc_expiry ON public.rc_register(rc_expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rc_register TO authenticated;
GRANT ALL ON public.rc_register TO service_role;
ALTER TABLE public.rc_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc company access" ON public.rc_register FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_rc_updated BEFORE UPDATE ON public.rc_register
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
