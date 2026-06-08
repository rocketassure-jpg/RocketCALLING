
-- 1. Theme preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_theme TEXT NOT NULL DEFAULT 'system' CHECK (ui_theme IN ('light','dark','system'));

-- 2. Masking + branding config on app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS masking_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'manager',    jsonb_build_object('masked', false, 'reveal_on_dial', false),
    'telecaller', jsonb_build_object('masked', true,  'reveal_on_dial', true),
    'agent',      jsonb_build_object('masked', true,  'reveal_on_dial', false)
  ),
  ADD COLUMN IF NOT EXISTS brand_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'primary',      '0 84% 60%',
    'secondary',    '24 95% 53%',
    'sidebar_bg',   '240 10% 12%',
    'logo_url',     '',
    'company_name', 'Rocket Services'
  );

-- 3. Lead assignment / campaign fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_campaign_name ON public.leads(campaign_name);
CREATE INDEX IF NOT EXISTS idx_leads_manager_id ON public.leads(manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);

-- Allow authenticated to read app_settings (read-only) so client can load brand/masking
GRANT SELECT ON public.app_settings TO authenticated;
