
-- 1. Add company_id columns where missing
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Backfill ai_suggestions from leads
UPDATE public.ai_suggestions s SET company_id = l.company_id
  FROM public.leads l WHERE l.id = s.lead_id AND s.company_id IS NULL;

-- Backfill api_keys from creator profile
UPDATE public.api_keys k SET company_id = p.company_id
  FROM public.profiles p WHERE p.id = k.created_by AND k.company_id IS NULL;

-- 2. app_settings
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 3. areas
DROP POLICY IF EXISTS "Admins manage areas" ON public.areas;
CREATE POLICY "Admins manage areas" ON public.areas FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 4. leads
DROP POLICY IF EXISTS "Admins manage leads" ON public.leads;
DROP POLICY IF EXISTS "Admins view all leads" ON public.leads;
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));
CREATE POLICY "Admins view all leads" ON public.leads FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 5. ai_suggestions
DROP POLICY IF EXISTS "Admins manage ai suggestions" ON public.ai_suggestions;
CREATE POLICY "Admins manage ai suggestions" ON public.ai_suggestions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 6. lead_notes (scope via leads join)
DROP POLICY IF EXISTS "Admins manage lead notes" ON public.lead_notes;
CREATE POLICY "Admins manage lead notes" ON public.lead_notes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id AND l.company_id = public.user_company_id())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id AND l.company_id = public.user_company_id())));

-- 7. break_logs (scope via profiles)
DROP POLICY IF EXISTS "Admins view all breaks" ON public.break_logs;
CREATE POLICY "Admins view all breaks" ON public.break_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = break_logs.telecaller_id AND p.company_id = public.user_company_id())));

-- 8. call_logs
DROP POLICY IF EXISTS "Admins view call logs" ON public.call_logs;
CREATE POLICY "Admins view call logs" ON public.call_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = call_logs.lead_id AND l.company_id = public.user_company_id())));

-- 9. dial_logs
DROP POLICY IF EXISTS "Admins view all dial logs" ON public.dial_logs;
CREATE POLICY "Admins view all dial logs" ON public.dial_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = dial_logs.telecaller_id AND p.company_id = public.user_company_id())));

-- 10. sms_logs
DROP POLICY IF EXISTS "Admins view sms logs" ON public.sms_logs;
CREATE POLICY "Admins view sms logs" ON public.sms_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = sms_logs.lead_id AND l.company_id = public.user_company_id())));

-- 11. whatsapp_logs
DROP POLICY IF EXISTS "Admins view whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins view whatsapp logs" ON public.whatsapp_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = whatsapp_logs.lead_id AND l.company_id = public.user_company_id())));

-- 12. claims_del
DROP POLICY IF EXISTS claims_del ON public.claims;
CREATE POLICY claims_del ON public.claims FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 13. marketing_integrations — restrict to admin/super_admin only
DROP POLICY IF EXISTS admin_or_company_marketing_integrations ON public.marketing_integrations;
CREATE POLICY admin_marketing_integrations ON public.marketing_integrations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

-- 14. message_templates — scope shared-template manager policy by company
DROP POLICY IF EXISTS "Managers manage shared templates" ON public.message_templates;
CREATE POLICY "Managers manage shared templates" ON public.message_templates FOR ALL TO authenticated
  USING (shared = true AND company_id = public.user_company_id() AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (shared = true AND company_id = public.user_company_id() AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')));

-- 15. role_permissions — scope admin manage to company (null = global, super_admin only)
DROP POLICY IF EXISTS "Admins manage role perms" ON public.role_permissions;
CREATE POLICY "Admins manage role perms" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id IS NOT NULL AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id IS NOT NULL AND company_id = public.user_company_id()));
DROP POLICY IF EXISTS "Admins managers view role perms" ON public.role_permissions;
CREATE POLICY "Admins managers view role perms" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) AND (company_id IS NULL OR company_id = public.user_company_id())));

-- 16. telecaller_areas — scope SELECT by company via profiles
DROP POLICY IF EXISTS "Admins view all assignments" ON public.telecaller_areas;
CREATE POLICY "Admins view all assignments" ON public.telecaller_areas FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = telecaller_areas.telecaller_id AND p.company_id = public.user_company_id())));

-- 17. api_keys — scope by company
DROP POLICY IF EXISTS "Admins manage api keys" ON public.api_keys;
CREATE POLICY "Admins manage api keys" ON public.api_keys FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));

-- Auto-stamp company_id on api_keys insert if missing
CREATE OR REPLACE FUNCTION public.api_keys_set_company() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN NEW.company_id := public.user_company_id(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_api_keys_set_company ON public.api_keys;
CREATE TRIGGER trg_api_keys_set_company BEFORE INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.api_keys_set_company();

-- 18. webhook_events — scope by company
DROP POLICY IF EXISTS "Admins manage webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Admins view webhook events" ON public.webhook_events;
CREATE POLICY "Admins manage webhook events" ON public.webhook_events FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));
CREATE POLICY "Admins view webhook events" ON public.webhook_events FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));
