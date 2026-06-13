
-- HEALTH POLICIES
CREATE TABLE public.health_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents_profile(id) ON DELETE SET NULL,
  policy_number TEXT,
  plan_name TEXT,
  plan_type TEXT,                -- individual / family_floater / group / senior_citizen
  cover_type TEXT,               -- new / renewal / portability
  proposer_name TEXT,
  proposer_dob DATE,
  proposer_phone TEXT,
  sum_insured NUMERIC(14,2),
  base_sum_insured NUMERIC(14,2),
  restore_benefit BOOLEAN DEFAULT false,
  no_claim_bonus_percent NUMERIC(5,2),
  room_rent_limit TEXT,
  copay_percent NUMERIC(5,2),
  pre_existing_disease TEXT,
  pre_existing_waiting_period INT,
  tpa_name TEXT,
  tpa_card_number TEXT,
  network_hospitals TEXT,
  addons JSONB DEFAULT '[]'::jsonb,
  issue_date DATE,
  start_date DATE,
  end_date DATE,
  net_premium NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  gross_premium NUMERIC(12,2) DEFAULT 0,
  payment_mode TEXT,
  payment_status TEXT,
  status TEXT DEFAULT 'active',
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_company ON public.health_policies(company_id);
CREATE INDEX idx_health_end ON public.health_policies(end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_policies TO authenticated;
GRANT ALL ON public.health_policies TO service_role;
ALTER TABLE public.health_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_policies company access" ON public.health_policies FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_health_policies_updated BEFORE UPDATE ON public.health_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HEALTH POLICY MEMBERS
CREATE TABLE public.health_policy_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.health_policies(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  relationship TEXT,
  date_of_birth DATE,
  gender TEXT,
  age INT,
  pre_existing_conditions TEXT,
  sum_insured_share NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_members_policy ON public.health_policy_members(policy_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_policy_members TO authenticated;
GRANT ALL ON public.health_policy_members TO service_role;
ALTER TABLE public.health_policy_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_members company access" ON public.health_policy_members FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());

-- LIFE POLICIES
CREATE TABLE public.life_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents_profile(id) ON DELETE SET NULL,
  policy_number TEXT,
  plan_name TEXT,
  plan_type TEXT,                -- term / endowment / ulip / money_back / whole_life / pension
  policyholder_name TEXT,
  policyholder_dob DATE,
  policyholder_phone TEXT,
  life_assured_name TEXT,
  life_assured_dob DATE,
  sum_assured NUMERIC(14,2),
  policy_term_years INT,
  premium_paying_term_years INT,
  premium_frequency TEXT,        -- monthly / quarterly / half_yearly / annually / single
  premium_amount NUMERIC(12,2),
  net_premium NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  gross_premium NUMERIC(12,2) DEFAULT 0,
  issue_date DATE,
  commencement_date DATE,
  maturity_date DATE,
  next_due_date DATE,
  last_paid_date DATE,
  grace_period_days INT DEFAULT 30,
  revival_window_days INT DEFAULT 1095,
  fund_value NUMERIC(14,2),       -- for ULIP
  bonus_accumulated NUMERIC(14,2),-- for endowment
  rider_details JSONB DEFAULT '[]'::jsonb,
  payment_mode TEXT,
  status TEXT DEFAULT 'active',  -- active / lapsed / paid_up / surrendered / matured / claimed
  lapsed_on DATE,
  document_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_life_company ON public.life_policies(company_id);
CREATE INDEX idx_life_due ON public.life_policies(next_due_date);
CREATE INDEX idx_life_status ON public.life_policies(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_policies TO authenticated;
GRANT ALL ON public.life_policies TO service_role;
ALTER TABLE public.life_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "life_policies company access" ON public.life_policies FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE TRIGGER trg_life_policies_updated BEFORE UPDATE ON public.life_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LIFE NOMINEES
CREATE TABLE public.life_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.life_policies(id) ON DELETE CASCADE,
  nominee_name TEXT NOT NULL,
  relationship TEXT,
  date_of_birth DATE,
  share_percent NUMERIC(5,2),
  is_minor BOOLEAN DEFAULT false,
  appointee_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_life_nominees_policy ON public.life_nominees(policy_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_nominees TO authenticated;
GRANT ALL ON public.life_nominees TO service_role;
ALTER TABLE public.life_nominees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "life_nominees company access" ON public.life_nominees FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());

-- LIFE PREMIUM SCHEDULE
CREATE TABLE public.life_premium_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.life_policies(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_date DATE,
  paid_amount NUMERIC(12,2),
  payment_reference TEXT,
  status TEXT DEFAULT 'pending', -- pending / paid / overdue / waived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_life_sched_policy ON public.life_premium_schedule(policy_id);
CREATE INDEX idx_life_sched_due ON public.life_premium_schedule(due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_premium_schedule TO authenticated;
GRANT ALL ON public.life_premium_schedule TO service_role;
ALTER TABLE public.life_premium_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "life_sched company access" ON public.life_premium_schedule FOR ALL TO authenticated
  USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
