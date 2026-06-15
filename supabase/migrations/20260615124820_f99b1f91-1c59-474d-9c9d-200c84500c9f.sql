
-- Payout Setup Engine: 7 rule tables + helper function
-- All tables: company-scoped, month-versioned (effective_month = first day of month), RLS for company admins + super admins.

-- 1) Insurance Commission Rules
CREATE TABLE public.payout_insurance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  insurer_name TEXT,
  product_category TEXT NOT NULL,
  sub_category TEXT,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- percentage | flat | slab
  commission_pct NUMERIC(7,3) DEFAULT 0,
  flat_amount NUMERIC(12,2) DEFAULT 0,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_insurance_rules TO authenticated;
GRANT ALL ON public.payout_insurance_rules TO service_role;
ALTER TABLE public.payout_insurance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view insurance rules" ON public.payout_insurance_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage insurance rules" ON public.payout_insurance_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_insurance_updated BEFORE UPDATE ON public.payout_insurance_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Agent Split Rules
CREATE TABLE public.payout_agent_split_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  commission_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  agent_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  branch_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  admin_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  referral_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_agent_split_rules TO authenticated;
GRANT ALL ON public.payout_agent_split_rules TO service_role;
ALTER TABLE public.payout_agent_split_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view split rules" ON public.payout_agent_split_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage split rules" ON public.payout_agent_split_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_split_updated BEFORE UPDATE ON public.payout_agent_split_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) RTO Pricing Rules
CREATE TABLE public.payout_rto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  govt_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  customer_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  agent_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  processing_days INTEGER DEFAULT 0,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_rto_rules TO authenticated;
GRANT ALL ON public.payout_rto_rules TO service_role;
ALTER TABLE public.payout_rto_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view rto rules" ON public.payout_rto_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage rto rules" ON public.payout_rto_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_rto_updated BEFORE UPDATE ON public.payout_rto_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Finance Commission Rules
CREATE TABLE public.payout_finance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  bank TEXT NOT NULL,
  product TEXT NOT NULL,
  commission_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  processing_fee NUMERIC(12,2) DEFAULT 0,
  agent_share_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_finance_rules TO authenticated;
GRANT ALL ON public.payout_finance_rules TO service_role;
ALTER TABLE public.payout_finance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view finance rules" ON public.payout_finance_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage finance rules" ON public.payout_finance_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_finance_updated BEFORE UPDATE ON public.payout_finance_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Vendor Rules
CREATE TABLE public.payout_vendor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- Broker | POS | DSA | InsuranceCompany | Aggregator
  product_type TEXT,
  commission_pct NUMERIC(7,3) DEFAULT 0,
  flat_amount NUMERIC(12,2) DEFAULT 0,
  commission_rule_ref UUID,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_vendor_rules TO authenticated;
GRANT ALL ON public.payout_vendor_rules TO service_role;
ALTER TABLE public.payout_vendor_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view vendor rules" ON public.payout_vendor_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage vendor rules" ON public.payout_vendor_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_vendor_updated BEFORE UPDATE ON public.payout_vendor_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) State Wise Rules
CREATE TABLE public.payout_state_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  state TEXT NOT NULL,
  rto_charges NUMERIC(12,2) DEFAULT 0,
  stamp_duty NUMERIC(12,2) DEFAULT 0,
  special_tax NUMERIC(12,2) DEFAULT 0,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_state_rules TO authenticated;
GRANT ALL ON public.payout_state_rules TO service_role;
ALTER TABLE public.payout_state_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view state rules" ON public.payout_state_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage state rules" ON public.payout_state_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_state_updated BEFORE UPDATE ON public.payout_state_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Tax & GST Rules
CREATE TABLE public.payout_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  gst_pct NUMERIC(7,3) NOT NULL DEFAULT 18,
  tds_pct NUMERIC(7,3) NOT NULL DEFAULT 5,
  service_tax_pct NUMERIC(7,3) DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_format TEXT DEFAULT 'INV-{YYYY}-{####}',
  auto_gst BOOLEAN NOT NULL DEFAULT true,
  auto_invoice BOOLEAN NOT NULL DEFAULT true,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_tax_rules TO authenticated;
GRANT ALL ON public.payout_tax_rules TO service_role;
ALTER TABLE public.payout_tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company can view tax rules" ON public.payout_tax_rules FOR SELECT TO authenticated USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "admins manage tax rules" ON public.payout_tax_rules FOR ALL TO authenticated USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid())) WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payout_tax_updated BEFORE UPDATE ON public.payout_tax_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit triggers (reuse existing audit_row_change)
CREATE TRIGGER trg_audit_payout_insurance AFTER INSERT OR UPDATE OR DELETE ON public.payout_insurance_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_split AFTER INSERT OR UPDATE OR DELETE ON public.payout_agent_split_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_rto AFTER INSERT OR UPDATE OR DELETE ON public.payout_rto_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_finance AFTER INSERT OR UPDATE OR DELETE ON public.payout_finance_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_vendor AFTER INSERT OR UPDATE OR DELETE ON public.payout_vendor_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_state AFTER INSERT OR UPDATE OR DELETE ON public.payout_state_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_audit_payout_tax AFTER INSERT OR UPDATE OR DELETE ON public.payout_tax_rules FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- Indexes for "latest active rule" lookups
CREATE INDEX idx_payout_insurance_lookup ON public.payout_insurance_rules (company_id, insurer_id, product_category, sub_category, effective_month DESC);
CREATE INDEX idx_payout_split_lookup ON public.payout_agent_split_rules (company_id, effective_month DESC);
CREATE INDEX idx_payout_rto_lookup ON public.payout_rto_rules (company_id, service_name, effective_month DESC);
CREATE INDEX idx_payout_finance_lookup ON public.payout_finance_rules (company_id, bank, product, effective_month DESC);
CREATE INDEX idx_payout_vendor_lookup ON public.payout_vendor_rules (company_id, vendor_name, effective_month DESC);
CREATE INDEX idx_payout_state_lookup ON public.payout_state_rules (company_id, state, effective_month DESC);
CREATE INDEX idx_payout_tax_lookup ON public.payout_tax_rules (company_id, effective_month DESC);
