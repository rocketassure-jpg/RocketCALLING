
-- ============ marketing_integrations ============
CREATE TABLE public.marketing_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('whatsapp','sms','rcs','voice','meta','instagram','linkedin')),
  label text NOT NULL,
  wa_api_key text,
  wa_phone_number_id text,
  wa_waba_id text,
  wa_webhook_secret text,
  sms_provider text CHECK (sms_provider IN ('twilio','textlocal','msg91','valuefirst')),
  sms_api_key text,
  sms_sender_id text,
  rcs_enabled boolean DEFAULT false,
  voice_provider text CHECK (voice_provider IN ('exotel','knowlarity','servetel','twilio')),
  voice_api_key text,
  voice_caller_id text,
  voice_tts_engine text DEFAULT 'google',
  ad_account_id text,
  page_id text,
  access_token text,
  status text DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  last_error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, platform, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_integrations TO authenticated;
GRANT ALL ON public.marketing_integrations TO service_role;
ALTER TABLE public.marketing_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_marketing_integrations" ON public.marketing_integrations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());
CREATE TRIGGER tr_marketing_integrations_updated BEFORE UPDATE ON public.marketing_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ marketing_templates ============
CREATE TABLE public.marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','rcs','voice','email')),
  category text CHECK (category IN ('renewal','welcome','followup','campaign','custom')),
  wa_template_name text,
  wa_template_language text DEFAULT 'en',
  wa_header_type text CHECK (wa_header_type IN ('text','image','document','video')),
  wa_header_content text,
  body_text text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  voice_script text,
  voice_language text DEFAULT 'hi-IN',
  rcs_rich_card jsonb,
  rcs_suggestions jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_templates TO authenticated;
GRANT ALL ON public.marketing_templates TO service_role;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_marketing_templates" ON public.marketing_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());
CREATE TRIGGER tr_marketing_templates_updated BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ audience_sync_configs ============
CREATE TABLE public.audience_sync_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.marketing_integrations(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'All' CHECK (category IN ('Motor','Health','Life','All')),
  audience_name text NOT NULL,
  meta_audience_id text,
  days_before_expiry int NOT NULL DEFAULT 30,
  days_after_expiry int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audience_sync_configs TO authenticated;
GRANT ALL ON public.audience_sync_configs TO service_role;
ALTER TABLE public.audience_sync_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_audience_sync_configs" ON public.audience_sync_configs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());

-- ============ audience_sync_logs ============
CREATE TABLE public.audience_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.audience_sync_configs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  records_matched int NOT NULL DEFAULT 0,
  records_sent int NOT NULL DEFAULT 0,
  status text CHECK (status IN ('success','error','partial')),
  message text,
  run_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audience_sync_logs TO authenticated;
GRANT ALL ON public.audience_sync_logs TO service_role;
ALTER TABLE public.audience_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_audience_sync_logs" ON public.audience_sync_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());

-- ============ scheduled_posts ============
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  media_url text,
  platforms text[] NOT NULL,
  category text NOT NULL DEFAULT 'General' CHECK (category IN ('Motor','Health','Life','All','General')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','posted','partial','failed','cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_scheduled_posts" ON public.scheduled_posts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());
CREATE TRIGGER tr_scheduled_posts_updated BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ social_post_logs ============
CREATE TABLE public.social_post_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text CHECK (status IN ('success','error')),
  response jsonb,
  posted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.social_post_logs TO authenticated;
GRANT ALL ON public.social_post_logs TO service_role;
ALTER TABLE public.social_post_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_social_post_logs" ON public.social_post_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());

-- ============ wa_webhook_messages ============
CREATE TABLE public.wa_webhook_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  wa_message_id text UNIQUE,
  from_number text,
  message_type text,
  message_text text,
  media_url text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  campaign_log_id uuid REFERENCES public.campaign_logs(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_webhook_messages TO authenticated;
GRANT ALL ON public.wa_webhook_messages TO service_role;
ALTER TABLE public.wa_webhook_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_or_company_wa_webhook_messages" ON public.wa_webhook_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR company_id = public.user_company_id());

-- ============ Extend renewal_campaigns ============
ALTER TABLE public.renewal_campaigns
  ADD COLUMN IF NOT EXISTS filter_expiry_from date,
  ADD COLUMN IF NOT EXISTS filter_expiry_to date,
  ADD COLUMN IF NOT EXISTS filter_policy_type text DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS filter_city text,
  ADD COLUMN IF NOT EXISTS filter_telecaller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_targets int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_count int NOT NULL DEFAULT 0;

-- ============ Extend campaign_logs ============
ALTER TABLE public.campaign_logs
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- ============ Extend app_settings ============
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS renewal_default_telecaller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renewal_alert_days text DEFAULT '1,7,15,30',
  ADD COLUMN IF NOT EXISTS renewal_default_channel text DEFAULT 'whatsapp' CHECK (renewal_default_channel IN ('whatsapp','sms','rcs','voice','manual')),
  ADD COLUMN IF NOT EXISTS renewal_auto_assign_logic text DEFAULT 'original_then_default' CHECK (renewal_auto_assign_logic IN ('original','default','original_then_default')),
  ADD COLUMN IF NOT EXISTS renewal_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_default_template_id uuid REFERENCES public.marketing_templates(id) ON DELETE SET NULL;
