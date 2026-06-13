-- Phase 2: Accounts Module schema

-- Insurers master
CREATE TABLE public.insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code TEXT,
  category TEXT,                -- 'motor' | 'health' | 'life' | 'general' | 'multi'
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  payout_cycle TEXT DEFAULT 'monthly', -- monthly | quarterly | adhoc
  tds_rate NUMERIC(5,2) DEFAULT 5.00,
  gst_applicable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurers TO authenticated;
GRANT ALL ON public.insurers TO service_role;
ALTER TABLE public.insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurers tenant read" ON public.insurers FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin());
CREATE POLICY "insurers tenant write" ON public.insurers FOR ALL TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin()) WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin());
CREATE TRIGGER trg_insurers_updated BEFORE UPDATE ON public.insurers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Commission rates per insurer × policy type
CREATE TABLE public.commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES public.insurers(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL,    -- motor_pvt_car_od, motor_2w_tp, health_indv, life_term, etc.
  product_subtype TEXT,
  od_rate NUMERIC(6,2) DEFAULT 0,
  tp_rate NUMERIC(6,2) DEFAULT 0,
  net_rate NUMERIC(6,2) DEFAULT 0,
  reward_rate NUMERIC(6,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rates TO authenticated;
GRANT ALL ON public.commission_rates TO service_role;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rates tenant read" ON public.commission_rates FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin());
CREATE POLICY "commission_rates tenant write" ON public.commission_rates FOR ALL TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin()) WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin());
CREATE TRIGGER trg_commission_rates_updated BEFORE UPDATE ON public.commission_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_commission_rates_insurer ON public.commission_rates(insurer_id, policy_type);

-- Agents (direct / posp / proxy)
CREATE TABLE public.agents_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  agent_code TEXT,
  agent_type TEXT DEFAULT 'direct', -- direct | posp | proxy
  phone TEXT,
  email TEXT,
  pan TEXT,
  aadhaar TEXT,
  posp_license_no TEXT,
  posp_license_expiry DATE,
  bank_name TEXT,
  bank_account TEXT,
  ifsc TEXT,
  split_percent NUMERIC(5,2) DEFAULT 0,  -- agent share of commission
  parent_agent_id UUID REFERENCES public.agents_profile(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents_profile TO authenticated;
GRANT ALL ON public.agents_profile TO service_role;
ALTER TABLE public.agents_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents tenant read" ON public.agents_profile FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin());
CREATE POLICY "agents tenant write" ON public.agents_profile FOR ALL TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin()) WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin());
CREATE TRIGGER trg_agents_profile_updated BEFORE UPDATE ON public.agents_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policy transactions (the heart of accounts)
CREATE TABLE public.policy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  policy_no TEXT,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents_profile(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  policy_type TEXT,             -- motor / health / life / general
  product_subtype TEXT,
  od_premium NUMERIC(12,2) DEFAULT 0,
  tp_premium NUMERIC(12,2) DEFAULT 0,
  net_premium NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  gross_premium NUMERIC(12,2) DEFAULT 0,
  commission_rate NUMERIC(6,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  reward_amount NUMERIC(12,2) DEFAULT 0,
  tds_amount NUMERIC(12,2) DEFAULT 0,
  agent_payout NUMERIC(12,2) DEFAULT 0,
  company_share NUMERIC(12,2) DEFAULT 0,
  expected_payout_date DATE,
  received_date DATE,
  received_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'expected', -- expected | received | overdue | cancelled
  payment_mode TEXT,
  utr_ref TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_transactions TO authenticated;
GRANT ALL ON public.policy_transactions TO service_role;
ALTER TABLE public.policy_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txn tenant read" ON public.policy_transactions FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin());
CREATE POLICY "txn tenant write" ON public.policy_transactions FOR ALL TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin()) WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin());
CREATE TRIGGER trg_txn_updated BEFORE UPDATE ON public.policy_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_txn_company_date ON public.policy_transactions(company_id, txn_date DESC);
CREATE INDEX idx_txn_status ON public.policy_transactions(company_id, status);
CREATE INDEX idx_txn_agent ON public.policy_transactions(agent_id);

-- Agent payouts (monthly settlement)
CREATE TABLE public.agent_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents_profile(id) ON DELETE CASCADE,
  period_month INT NOT NULL,    -- 1..12
  period_year INT NOT NULL,
  total_business NUMERIC(14,2) DEFAULT 0,
  total_commission NUMERIC(14,2) DEFAULT 0,
  total_reward NUMERIC(14,2) DEFAULT 0,
  tds_deducted NUMERIC(14,2) DEFAULT 0,
  net_payable NUMERIC(14,2) DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  payment_date DATE,
  payment_mode TEXT,
  utr_ref TEXT,
  status TEXT DEFAULT 'pending', -- pending | partial | paid
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, agent_id, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_payouts TO authenticated;
GRANT ALL ON public.agent_payouts TO service_role;
ALTER TABLE public.agent_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts tenant read" ON public.agent_payouts FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin());
CREATE POLICY "payouts tenant write" ON public.agent_payouts FOR ALL TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin()) WITH CHECK (company_id = public.user_company_id() OR public.is_super_admin());
CREATE TRIGGER trg_agent_payouts_updated BEFORE UPDATE ON public.agent_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
