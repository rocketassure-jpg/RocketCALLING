
-- GLOBAL SETTINGS
CREATE TABLE public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs_read_all_auth" ON public.global_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "gs_super_write" ON public.global_settings FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_gs_updated BEFORE UPDATE ON public.global_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FEATURE FLAGS
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_for_roles TEXT[],
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flag_key, company_id)
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_read_own" ON public.feature_flags FOR SELECT TO authenticated USING (company_id IS NULL OR company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "ff_super_write" ON public.feature_flags FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_ff_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target TEXT NOT NULL DEFAULT 'all',
  target_company_ids UUID[],
  target_roles TEXT[],
  show_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  show_until TIMESTAMPTZ,
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_read_targeted" ON public.announcements FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (
    show_from <= now() AND (show_until IS NULL OR show_until >= now())
    AND (
      target = 'all'
      OR (target = 'specific_companies' AND public.user_company_id() = ANY(target_company_ids))
    )
  )
);
CREATE POLICY "ann_super_write" ON public.announcements FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- PLAN TEMPLATES
CREATE TABLE public.plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  included_modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_users INT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_templates TO authenticated;
GRANT ALL ON public.plan_templates TO service_role;
ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_read_all" ON public.plan_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "pt_super_write" ON public.plan_templates FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_pt_updated BEFORE UPDATE ON public.plan_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUPER ADMIN AUDIT LOG
CREATE TABLE public.super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID,
  action_type TEXT NOT NULL,
  target_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  target_user_id UUID,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.super_admin_audit_log TO authenticated;
GRANT ALL ON public.super_admin_audit_log TO service_role;
ALTER TABLE public.super_admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saa_super_read" ON public.super_admin_audit_log FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "saa_super_insert" ON public.super_admin_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) AND super_admin_id = auth.uid());
CREATE INDEX idx_saa_created ON public.super_admin_audit_log(created_at DESC);
CREATE INDEX idx_saa_company ON public.super_admin_audit_log(target_company_id);

-- IMPERSONATION SESSIONS
CREATE TABLE public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL,
  target_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL,
  reason TEXT,
  actions_taken TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imp_super_all" ON public.impersonation_sessions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- SEED GLOBAL SETTINGS
INSERT INTO public.global_settings (setting_key, setting_value, description) VALUES
  ('default_trial_days', '14'::jsonb, 'New company free trial duration (days)'),
  ('default_modules_on_signup', '["telecaller_crm","accounts"]'::jsonb, 'Modules activated automatically for new companies'),
  ('max_users_per_company_default', '10'::jsonb, 'Default max telecallers per company'),
  ('platform_name', '"Rocket Services"'::jsonb, 'Platform display name'),
  ('support_phone', '"+91-9826000000"'::jsonb, 'Support contact number'),
  ('support_email', '"support@rocketservices.in"'::jsonb, 'Support contact email'),
  ('maintenance_mode', 'false'::jsonb, 'Platform maintenance switch'),
  ('new_company_registration', 'true'::jsonb, 'Allow self-signup of new companies'),
  ('whatsapp_provider', '"aisensy"'::jsonb, 'Global WhatsApp provider'),
  ('session_timeout_minutes', '120'::jsonb, 'Super admin session timeout')
ON CONFLICT (setting_key) DO NOTHING;

-- SEED PLAN TEMPLATES
INSERT INTO public.plan_templates (plan_name, included_modules, max_users, monthly_price, yearly_price, sort_order) VALUES
  ('Starter', ARRAY['telecaller_crm','accounts'], 5, 999, 9999, 1),
  ('Motor Pro', ARRAY['telecaller_crm','accounts','motor_insurance'], 15, 1799, 17999, 2),
  ('Health Pro', ARRAY['telecaller_crm','accounts','health_insurance'], 15, 1599, 15999, 3),
  ('Full Suite', ARRAY['telecaller_crm','accounts','motor_insurance','health_insurance','life_insurance','rto_services'], 50, 2999, 29999, 4),
  ('Custom', ARRAY[]::TEXT[], NULL, 0, 0, 5)
ON CONFLICT (plan_name) DO NOTHING;

-- SEED DEFAULT FEATURE FLAGS (global)
INSERT INTO public.feature_flags (flag_key, company_id, is_enabled, description) VALUES
  ('dark_mode', NULL, true, 'Dark mode UI toggle'),
  ('list_view', NULL, true, 'Dialer list view'),
  ('revival_date_picker', NULL, true, 'Revival date picker on policies'),
  ('bulk_whatsapp', NULL, true, 'Bulk WhatsApp messaging'),
  ('campaign_manager', NULL, true, 'Campaign manager'),
  ('number_masking', NULL, true, 'Phone number masking'),
  ('proxy_agent', NULL, false, 'Proxy agent system'),
  ('rto_document_checklist', NULL, true, 'RTO document checklist'),
  ('premium_calendar', NULL, false, 'Premium calendar view')
ON CONFLICT (flag_key, company_id) DO NOTHING;
