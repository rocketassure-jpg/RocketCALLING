
-- =============== TEMPLATES ===============
CREATE TABLE public.renewal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','rcs','voice')),
  body_text text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_templates TO authenticated;
GRANT ALL ON public.renewal_templates TO service_role;
ALTER TABLE public.renewal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members read templates" ON public.renewal_templates FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "admins manage templates" ON public.renewal_templates FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));
CREATE TRIGGER tr_renewal_templates_updated BEFORE UPDATE ON public.renewal_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== ADMIN SETTINGS ===============
CREATE TABLE public.admin_renewal_settings (
  company_id uuid PRIMARY KEY,
  default_telecaller_id uuid,
  alert_days int[] NOT NULL DEFAULT ARRAY[1,7,15,30],
  default_channel text NOT NULL DEFAULT 'whatsapp' CHECK (default_channel IN ('whatsapp','sms','rcs','voice','manual')),
  auto_assign_logic text NOT NULL DEFAULT 'original_then_default' CHECK (auto_assign_logic IN ('original_only','default_only','original_then_default')),
  auto_send_enabled boolean NOT NULL DEFAULT false,
  default_template_id uuid REFERENCES public.renewal_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_renewal_settings TO authenticated;
GRANT ALL ON public.admin_renewal_settings TO service_role;
ALTER TABLE public.admin_renewal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members read settings" ON public.admin_renewal_settings FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "admins manage settings" ON public.admin_renewal_settings FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE TRIGGER tr_admin_renewal_settings_updated BEFORE UPDATE ON public.admin_renewal_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== RENEWALS ===============
CREATE TABLE public.renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name text,
  phone_number text,
  policy_type text,
  policy_number text,
  expiry_date date NOT NULL,
  premium_amount numeric DEFAULT 0,
  assigned_telecaller_id uuid,
  original_telecaller_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','renewed','lost')),
  last_contact_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_renewals_company_expiry ON public.renewals(company_id, expiry_date);
CREATE INDEX idx_renewals_assigned ON public.renewals(assigned_telecaller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewals TO authenticated;
GRANT ALL ON public.renewals TO service_role;
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telecaller sees own renewals" ON public.renewals FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() AND assigned_telecaller_id = auth.uid());
CREATE POLICY "manager sees team renewals" ON public.renewals FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() AND public.has_role(auth.uid(),'manager')
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = renewals.assigned_telecaller_id AND p.manager_id = auth.uid()));
CREATE POLICY "admin sees all renewals" ON public.renewals FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE POLICY "telecaller updates own renewals" ON public.renewals FOR UPDATE TO authenticated
  USING (company_id = public.user_company_id() AND assigned_telecaller_id = auth.uid())
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "admin manages renewals" ON public.renewals FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

CREATE TRIGGER tr_renewals_updated BEFORE UPDATE ON public.renewals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== CAMPAIGNS ===============
CREATE TABLE public.renewal_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','rcs','voice','telecaller')),
  template_id uuid REFERENCES public.renewal_templates(id) ON DELETE SET NULL,
  filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_count int NOT NULL DEFAULT 0,
  response_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','completed','failed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_campaigns TO authenticated;
GRANT ALL ON public.renewal_campaigns TO service_role;
ALTER TABLE public.renewal_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company reads campaigns" ON public.renewal_campaigns FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "admin manages campaigns" ON public.renewal_campaigns FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));
CREATE TRIGGER tr_renewal_campaigns_updated BEFORE UPDATE ON public.renewal_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== CAMPAIGN LOGS ===============
CREATE TABLE public.campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.renewal_campaigns(id) ON DELETE CASCADE,
  renewal_id uuid REFERENCES public.renewals(id) ON DELETE SET NULL,
  customer_id uuid,
  phone_number text,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  provider_message_id text,
  sent_at timestamptz,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_logs TO authenticated;
GRANT ALL ON public.campaign_logs TO service_role;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company reads campaign logs" ON public.campaign_logs FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "admin manages campaign logs" ON public.campaign_logs FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- =============== AUTO-ASSIGN RENEWAL TRIGGER ===============
CREATE OR REPLACE FUNCTION public.assign_renewal_telecaller()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _s public.admin_renewal_settings%ROWTYPE;
  _orig_active boolean := false;
BEGIN
  SELECT * INTO _s FROM public.admin_renewal_settings WHERE company_id = NEW.company_id;

  IF NEW.original_telecaller_id IS NOT NULL THEN
    SELECT (is_active AND is_approved) INTO _orig_active FROM public.profiles WHERE id = NEW.original_telecaller_id;
  END IF;

  IF NEW.assigned_telecaller_id IS NULL THEN
    IF _s.company_id IS NULL OR _s.auto_assign_logic = 'original_then_default' THEN
      NEW.assigned_telecaller_id := CASE WHEN _orig_active THEN NEW.original_telecaller_id ELSE _s.default_telecaller_id END;
    ELSIF _s.auto_assign_logic = 'original_only' THEN
      NEW.assigned_telecaller_id := CASE WHEN _orig_active THEN NEW.original_telecaller_id ELSE NULL END;
    ELSE -- default_only
      NEW.assigned_telecaller_id := _s.default_telecaller_id;
    END IF;
  END IF;

  RETURN NEW;
END $$;
CREATE TRIGGER tr_assign_renewal BEFORE INSERT ON public.renewals FOR EACH ROW EXECUTE FUNCTION public.assign_renewal_telecaller();

-- =============== LEAD -> CUSTOMER ON WON ===============
CREATE OR REPLACE FUNCTION public.lead_to_customer_on_won()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cust_id uuid;
BEGIN
  IF lower(NEW.status::text) <> 'won' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND lower(COALESCE(OLD.status::text,'')) = 'won' THEN RETURN NEW; END IF;

  _cust_id := NEW.customer_id;
  IF _cust_id IS NULL THEN
    INSERT INTO public.customers (company_id, full_name, mobile, city, notes, source_lead_id, created_by)
    VALUES (NEW.company_id, NEW.customer_name, NEW.phone_number, NEW.city_village, NEW.notes, NEW.id, NEW.assigned_telecaller)
    RETURNING id INTO _cust_id;
    UPDATE public.leads SET customer_id = _cust_id WHERE id = NEW.id;
  END IF;

  IF NEW.policy_expiry_date IS NOT NULL THEN
    INSERT INTO public.renewals (company_id, customer_id, lead_id, customer_name, phone_number, policy_type,
                                 policy_number, expiry_date, premium_amount, original_telecaller_id, assigned_telecaller_id)
    VALUES (NEW.company_id, _cust_id, NEW.id, NEW.customer_name, NEW.phone_number, NEW.policy_type::text,
            NEW.policy_number, NEW.policy_expiry_date, COALESCE(NEW.premium_amount,0),
            NEW.assigned_telecaller, NEW.assigned_telecaller);
  END IF;

  RETURN NEW;
END $$;
CREATE TRIGGER tr_lead_won_to_customer AFTER INSERT OR UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.lead_to_customer_on_won();
