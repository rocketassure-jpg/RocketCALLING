DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins view company profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));
CREATE POLICY "Admins update company profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND company_id = public.user_company_id()));

DROP POLICY IF EXISTS "Authenticated view areas" ON public.areas;
DROP POLICY IF EXISTS "Managers view areas" ON public.areas;
CREATE POLICY "Users view company areas" ON public.areas FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

DROP POLICY IF EXISTS "Authenticated view settings" ON public.app_settings;
CREATE POLICY "Users view company settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view roles" ON public.user_roles;
CREATE POLICY "Admins view company roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.user_company_id())));
CREATE POLICY "Admins insert company roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND role <> 'admin'::app_role AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.user_company_id())));
CREATE POLICY "Admins delete company roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.user_company_id())));

ALTER TABLE public.crm_fields ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Auth view crm fields" ON public.crm_fields;
DROP POLICY IF EXISTS "Admins manage crm fields" ON public.crm_fields;
CREATE POLICY "Users view company crm fields" ON public.crm_fields FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id IS NULL OR company_id = public.user_company_id());
CREATE POLICY "Admins manage company crm fields" ON public.crm_fields FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));

ALTER TABLE public.lead_statuses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Auth view lead statuses" ON public.lead_statuses;
DROP POLICY IF EXISTS "Admins manage lead statuses" ON public.lead_statuses;
CREATE POLICY "Users view company lead statuses" ON public.lead_statuses FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id IS NULL OR company_id = public.user_company_id());
CREATE POLICY "Admins manage company lead statuses" ON public.lead_statuses FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));

ALTER TABLE public.training_materials ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Auth view training" ON public.training_materials;
DROP POLICY IF EXISTS "Admins manage training" ON public.training_materials;
CREATE POLICY "Users view company training" ON public.training_materials FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id IS NULL OR company_id = public.user_company_id());
CREATE POLICY "Admins manage company training" ON public.training_materials FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));

DROP POLICY IF EXISTS "Auth view role perms" ON public.role_permissions;
CREATE POLICY "Admins managers view role perms" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
DROP POLICY IF EXISTS "Admins view enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Admins update enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Admins delete enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Managers view enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Managers update enquiries" ON public.enquiries;
CREATE POLICY "Admins view company enquiries" ON public.enquiries FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) AND (company_id IS NULL OR company_id = public.user_company_id())));
CREATE POLICY "Admins update company enquiries" ON public.enquiries FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) AND (company_id IS NULL OR company_id = public.user_company_id())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) AND (company_id IS NULL OR company_id = public.user_company_id())));
CREATE POLICY "Admins delete company enquiries" ON public.enquiries FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(),'admin') AND (company_id IS NULL OR company_id = public.user_company_id())));

REVOKE EXECUTE ON FUNCTION public.claim_log_status() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invite_code_required() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_self_escalation() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rto_log_status_change() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_broker_achievement_from_txn() FROM anon, PUBLIC;