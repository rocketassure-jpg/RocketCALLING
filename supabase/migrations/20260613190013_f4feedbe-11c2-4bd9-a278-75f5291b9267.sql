
-- Add sub_agent to the role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sub_agent';

-- Branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_branches_company_code ON public.branches(company_id, lower(code)) WHERE code IS NOT NULL;
CREATE INDEX idx_branches_company ON public.branches(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_company"
ON public.branches FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

CREATE POLICY "branches_insert_admin"
ON public.branches FOR INSERT TO authenticated
WITH CHECK (
  (public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')))
);

CREATE POLICY "branches_update_admin"
ON public.branches FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
);

CREATE POLICY "branches_delete_admin"
ON public.branches FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
);

CREATE TRIGGER branches_set_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- branch_id on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);

-- Helper
CREATE OR REPLACE FUNCTION public.user_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.user_branch_id() FROM anon;
