
DROP POLICY IF EXISTS "agents tenant read" ON public.agents_profile;
CREATE POLICY "agents tenant read" ON public.agents_profile FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
);

DROP POLICY IF EXISTS admin_marketing_integrations ON public.marketing_integrations;
CREATE POLICY admin_marketing_integrations ON public.marketing_integrations FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin'))
);

DROP POLICY IF EXISTS remit_company_all ON public.premium_remittance;
CREATE POLICY remit_select ON public.premium_remittance FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY remit_write ON public.premium_remittance FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
);
