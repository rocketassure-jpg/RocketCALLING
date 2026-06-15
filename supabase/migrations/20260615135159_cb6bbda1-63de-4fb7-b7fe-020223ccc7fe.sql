
-- Fix cross-tenant policies: scope admin access to own company
DROP POLICY IF EXISTS admin_or_company_audience_sync_configs ON public.audience_sync_configs;
CREATE POLICY admin_or_company_audience_sync_configs ON public.audience_sync_configs
  FOR ALL TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id())
  WITH CHECK ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS admin_or_company_audience_sync_logs ON public.audience_sync_logs;
CREATE POLICY admin_or_company_audience_sync_logs ON public.audience_sync_logs
  FOR SELECT TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id());

DROP POLICY IF EXISTS admin_or_company_marketing_templates ON public.marketing_templates;
CREATE POLICY admin_or_company_marketing_templates ON public.marketing_templates
  FOR ALL TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id())
  WITH CHECK ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS admin_or_company_scheduled_posts ON public.scheduled_posts;
CREATE POLICY admin_or_company_scheduled_posts ON public.scheduled_posts
  FOR ALL TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id())
  WITH CHECK ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS admin_or_company_social_post_logs ON public.social_post_logs;
CREATE POLICY admin_or_company_social_post_logs ON public.social_post_logs
  FOR SELECT TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id());

DROP POLICY IF EXISTS admin_or_company_wa_webhook_messages ON public.wa_webhook_messages;
CREATE POLICY admin_or_company_wa_webhook_messages ON public.wa_webhook_messages
  FOR ALL TO authenticated
  USING ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()) OR company_id = user_company_id())
  WITH CHECK ((company_id = user_company_id() AND has_role(auth.uid(),'admin'::app_role)) OR is_super_admin(auth.uid()));

-- Restrict sender-view policies on whatsapp_logs and sms_logs to authenticated only
DROP POLICY IF EXISTS "Sender view own whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Sender view own whatsapp logs" ON public.whatsapp_logs
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = sent_by);

DROP POLICY IF EXISTS "Sender view own sms logs" ON public.sms_logs;
CREATE POLICY "Sender view own sms logs" ON public.sms_logs
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = sent_by);
