-- 1) Hide invite_code column from authenticated/anon
REVOKE SELECT (invite_code) ON public.app_settings FROM authenticated;
REVOKE SELECT (invite_code) ON public.app_settings FROM anon;

-- 2) Add company_id to message_templates, backfill, restrict shared SELECT
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS company_id uuid;
UPDATE public.message_templates mt
   SET company_id = p.company_id
  FROM public.profiles p
 WHERE p.id = mt.owner_id AND mt.company_id IS NULL;

DROP POLICY IF EXISTS "Read shared templates" ON public.message_templates;
CREATE POLICY "Read shared templates"
ON public.message_templates
FOR SELECT
TO authenticated
USING (shared = true AND company_id = public.user_company_id());

-- 3) Company-scope WITH CHECK on telecaller_areas admin policy
DROP POLICY IF EXISTS "Admins manage assignments" ON public.telecaller_areas;
CREATE POLICY "Admins manage assignments"
ON public.telecaller_areas
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = telecaller_areas.telecaller_id
      AND p.company_id = public.user_company_id()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = telecaller_areas.telecaller_id
      AND p.company_id = public.user_company_id()
  )
);