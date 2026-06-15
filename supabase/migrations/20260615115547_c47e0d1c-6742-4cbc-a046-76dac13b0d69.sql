CREATE TABLE IF NOT EXISTS public.whatsapp_bridge_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  bridge_url text,
  bridge_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bridge_settings TO authenticated;
GRANT ALL ON public.whatsapp_bridge_settings TO service_role;

ALTER TABLE public.whatsapp_bridge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bridge_settings_admin_select" ON public.whatsapp_bridge_settings
  FOR SELECT TO authenticated
  USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE POLICY "bridge_settings_admin_insert" ON public.whatsapp_bridge_settings
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE POLICY "bridge_settings_admin_update" ON public.whatsapp_bridge_settings
  FOR UPDATE TO authenticated
  USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE POLICY "bridge_settings_admin_delete" ON public.whatsapp_bridge_settings
  FOR DELETE TO authenticated
  USING ((company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_bridge_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_bridge_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();