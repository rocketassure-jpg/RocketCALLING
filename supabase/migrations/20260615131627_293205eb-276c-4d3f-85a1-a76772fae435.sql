
-- Add designation to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;

-- 1) employee_designations
CREATE TABLE IF NOT EXISTS public.employee_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_designations TO authenticated;
GRANT ALL ON public.employee_designations TO service_role;

ALTER TABLE public.employee_designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "designations_select_company" ON public.employee_designations
  FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "designations_admin_write" ON public.employee_designations
  FOR ALL TO authenticated
  USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER designations_updated BEFORE UPDATE ON public.employee_designations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) compensation_rules
CREATE TABLE IF NOT EXISTS public.compensation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  designation_key TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id UUID,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  incentive_type TEXT NOT NULL DEFAULT 'flat_monthly',
  incentive_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  slabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  effective_month DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comp_rules_lookup_idx
  ON public.compensation_rules (company_id, designation_key, effective_month DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compensation_rules TO authenticated;
GRANT ALL ON public.compensation_rules TO service_role;

ALTER TABLE public.compensation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp_rules_select" ON public.compensation_rules
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id = public.user_company_id() AND (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()))
  );

CREATE POLICY "comp_rules_admin_write" ON public.compensation_rules
  FOR ALL TO authenticated
  USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER comp_rules_updated BEFORE UPDATE ON public.compensation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default designations for existing companies
INSERT INTO public.employee_designations (company_id, key, label, sort_order)
SELECT c.id, x.key, x.label, x.sort_order
FROM public.companies c
CROSS JOIN (VALUES
  ('branch_manager', 'Branch / Master Manager', 10),
  ('manager', 'Manager', 20),
  ('telecaller', 'Telecaller', 30),
  ('field_agent', 'Field Agent', 40),
  ('claim_dept', 'Claim Department', 50),
  ('legal', 'Legal', 60),
  ('underwriter', 'Underwriter', 70),
  ('other', 'Other', 99)
) AS x(key, label, sort_order)
ON CONFLICT (company_id, key) DO NOTHING;
