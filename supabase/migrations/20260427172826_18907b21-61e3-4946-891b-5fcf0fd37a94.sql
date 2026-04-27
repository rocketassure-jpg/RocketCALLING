
-- App settings (singleton)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_business_messaging boolean NOT NULL DEFAULT false,
  whatsapp_notifications boolean NOT NULL DEFAULT true,
  post_interaction_actions boolean NOT NULL DEFAULT true,
  auto_start_allocation boolean NOT NULL DEFAULT false,
  variable_retry_enabled boolean NOT NULL DEFAULT false,
  retry_1_hours integer NOT NULL DEFAULT 5,
  retry_2_hours integer NOT NULL DEFAULT 24,
  allow_logout_mobile boolean NOT NULL DEFAULT true,
  allow_logout_web boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated view settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.app_settings DEFAULT VALUES;
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Role permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  track_personal_calls boolean NOT NULL DEFAULT false,
  mask_phone boolean NOT NULL DEFAULT false,
  recording_request boolean NOT NULL DEFAULT false,
  manage_ivr boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage role perms" ON public.role_permissions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Auth view role perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
INSERT INTO public.role_permissions (role) VALUES ('admin'),('manager'),('telecaller');
CREATE TRIGGER trg_role_perms_updated BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CRM custom fields
CREATE TABLE public.crm_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','number','date','select')),
  mandatory boolean NOT NULL DEFAULT false,
  options text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm fields" ON public.crm_fields FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Auth view crm fields" ON public.crm_fields FOR SELECT TO authenticated USING (true);

-- Lead statuses (draggable)
CREATE TABLE public.lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bucket text NOT NULL DEFAULT 'Hot' CHECK (bucket IN ('Hot','Cold','Won','Lost')),
  color text NOT NULL DEFAULT '#ef4444',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead statuses" ON public.lead_statuses FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Auth view lead statuses" ON public.lead_statuses FOR SELECT TO authenticated USING (true);

INSERT INTO public.lead_statuses (name,bucket,color,sort_order) VALUES
  ('Hot Followup','Hot','#ef4444',1),
  ('Sales Closed','Won','#22c55e',2),
  ('Not Interested','Lost','#64748b',3),
  ('Callback','Cold','#3b82f6',4);
