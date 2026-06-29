-- Batch C/D schema additions for audit completion
ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS renewal_lead_created boolean NOT NULL DEFAULT false;
ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS renewal_lead_id uuid;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posp_valid_until date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_passed boolean DEFAULT false;

ALTER TABLE public.motor_policies ADD COLUMN IF NOT EXISTS ncb_applied integer;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS claim_free_years integer;

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS irdai_rates jsonb DEFAULT '{}'::jsonb;