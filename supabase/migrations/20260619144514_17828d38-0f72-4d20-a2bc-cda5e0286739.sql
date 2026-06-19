
-- 1) agents_profile: remove managers from access (admins/super_admins only)
DROP POLICY IF EXISTS "agents tenant read" ON public.agents_profile;
DROP POLICY IF EXISTS "agents tenant write" ON public.agents_profile;

CREATE POLICY "agents admin read"
ON public.agents_profile FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
);

CREATE POLICY "agents admin write"
ON public.agents_profile FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
);

-- 2) external_api_registry: revoke column-level SELECT on api_key from authenticated
REVOKE SELECT (api_key) ON public.external_api_registry FROM authenticated;
-- service_role and SECURITY DEFINER fn public.get_external_api_key(_id) remain the only access paths

-- 3) rto_service_types: drop anon read, restrict to authenticated
DROP POLICY IF EXISTS "rto_service_types public read" ON public.rto_service_types;
CREATE POLICY "rto_service_types authenticated read"
ON public.rto_service_types FOR SELECT TO authenticated
USING (true);

-- 4) Prevent any non-super-admin (including company admins) from setting is_super_admin = true
CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only existing super_admins may toggle the super_admin flag on any profile
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
     AND NOT COALESCE(public.is_super_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Only super admins can change is_super_admin';
  END IF;

  -- Self-edits by non-admins cannot touch privileged fields
  IF auth.uid() = NEW.id
     AND NOT COALESCE(public.is_super_admin(auth.uid()), false)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
       OR NEW.is_active     IS DISTINCT FROM OLD.is_active
       OR NEW.is_approved   IS DISTINCT FROM OLD.is_approved
       OR NEW.company_id    IS DISTINCT FROM OLD.company_id
       OR NEW.manager_id    IS DISTINCT FROM OLD.manager_id
       OR NEW.requested_role IS DISTINCT FROM OLD.requested_role
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
