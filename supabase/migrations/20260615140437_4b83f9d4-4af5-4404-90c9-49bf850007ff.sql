
CREATE TABLE public.external_api_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  usecase text,
  url text,
  api_key text,
  remark text,
  status text NOT NULL DEFAULT 'pending',
  last_checked_at timestamptz,
  last_check_result text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_api_registry TO authenticated;
GRANT ALL ON public.external_api_registry TO service_role;

ALTER TABLE public.external_api_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage company external apis"
ON public.external_api_registry
FOR ALL
TO authenticated
USING (
  company_id = public.user_company_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
)
WITH CHECK (
  company_id = public.user_company_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
);

CREATE TRIGGER trg_external_api_registry_updated
BEFORE UPDATE ON public.external_api_registry
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
