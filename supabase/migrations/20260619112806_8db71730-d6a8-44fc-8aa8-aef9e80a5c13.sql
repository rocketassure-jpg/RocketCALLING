
-- 1. Restrict agents_profile writes to admin/manager only
DROP POLICY IF EXISTS "agents tenant write" ON public.agents_profile;
CREATE POLICY "agents tenant write" ON public.agents_profile
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id()
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id()
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
);

-- 2. Revoke column-level SELECT on app_settings.invite_code from authenticated
REVOKE SELECT (invite_code) ON public.app_settings FROM authenticated;
REVOKE SELECT (invite_code) ON public.app_settings FROM anon;

-- 3. Revoke column-level SELECT on external_api_registry.api_key from authenticated
REVOKE SELECT (api_key) ON public.external_api_registry FROM authenticated;
REVOKE SELECT (api_key) ON public.external_api_registry FROM anon;

CREATE OR REPLACE FUNCTION public.get_external_api_key(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT api_key FROM public.external_api_registry
  WHERE id = _id
    AND company_id = public.user_company_id()
    AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid()))
$$;

-- 4. Admin visibility for orphaned sms_logs (lead_id IS NULL) within the company
DROP POLICY IF EXISTS "Admins view orphan sms logs" ON public.sms_logs;
CREATE POLICY "Admins view orphan sms logs" ON public.sms_logs
FOR SELECT TO authenticated
USING (
  lead_id IS NULL
  AND public.has_role(auth.uid(),'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = sms_logs.sent_by
      AND p.company_id = public.user_company_id()
  )
);

-- 5. Admin visibility for orphaned whatsapp_logs (lead_id IS NULL) within the company
DROP POLICY IF EXISTS "Admins view orphan whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins view orphan whatsapp logs" ON public.whatsapp_logs
FOR SELECT TO authenticated
USING (
  lead_id IS NULL
  AND public.has_role(auth.uid(),'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = whatsapp_logs.sent_by
      AND p.company_id = public.user_company_id()
  )
);
