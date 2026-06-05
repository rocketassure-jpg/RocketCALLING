
-- 1. Tighten telecaller policies to require telecaller role
DROP POLICY IF EXISTS "Telecallers view ai for their leads" ON public.ai_suggestions;
CREATE POLICY "Telecallers view ai for their leads"
ON public.ai_suggestions FOR SELECT
USING (
  has_role(auth.uid(), 'telecaller'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = ai_suggestions.lead_id
      AND telecaller_has_area(auth.uid(), l.area_id)
  )
);

DROP POLICY IF EXISTS "Telecallers view notes for their leads" ON public.lead_notes;
CREATE POLICY "Telecallers view notes for their leads"
ON public.lead_notes FOR SELECT
USING (
  has_role(auth.uid(), 'telecaller'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id
      AND telecaller_has_area(auth.uid(), l.area_id)
  )
);

-- 2. Lock down SECURITY DEFINER functions - revoke EXECUTE from public/anon
REVOKE EXECUTE ON FUNCTION public.telecaller_has_area(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.manager_can_see_lead(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
