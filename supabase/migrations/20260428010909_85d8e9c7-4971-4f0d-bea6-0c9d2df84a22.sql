
-- Expand leads with vehicle / policy / accounting fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS chassis_number text,
  ADD COLUMN IF NOT EXISTS engine_number text,
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS maker_name text,
  ADD COLUMN IF NOT EXISTS model_name text,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS reg_date date,
  ADD COLUMN IF NOT EXISTS fitness_upto date,
  ADD COLUMN IF NOT EXISTS pucc_upto date,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS authorised_person text,
  ADD COLUMN IF NOT EXISTS mobile_2 text,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS city_village text,
  ADD COLUMN IF NOT EXISTS policy_number text,
  ADD COLUMN IF NOT EXISTS insurance_company text,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS agent_sm_name text,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS policy_copy_url text,
  ADD COLUMN IF NOT EXISTS net_od numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tp_premium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_premium_incl_gst numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_back numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS remark text,
  ADD COLUMN IF NOT EXISTS lead_source text DEFAULT 'Manual';

CREATE INDEX IF NOT EXISTS idx_leads_registration_number ON public.leads(registration_number);
CREATE INDEX IF NOT EXISTS idx_leads_phone_last4 ON public.leads(right(phone_number, 4));

-- App settings: sheet url
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS master_sheet_url text;

-- API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api keys" ON public.api_keys
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Webhook events log
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'whatsapp',
  payload jsonb NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook events" ON public.webhook_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage webhook events" ON public.webhook_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
