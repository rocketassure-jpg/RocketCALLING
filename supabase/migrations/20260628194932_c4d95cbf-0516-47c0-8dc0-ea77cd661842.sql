
-- lead_quotes table
CREATE TABLE IF NOT EXISTS public.lead_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  insurer text NOT NULL,
  policy_type text,
  premium numeric(12,2) NOT NULL DEFAULT 0,
  idv numeric(12,2),
  plan_type text,
  valid_until date,
  message_sent text,
  channel text NOT NULL DEFAULT 'whatsapp',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_quotes TO authenticated;
GRANT ALL ON public.lead_quotes TO service_role;
ALTER TABLE public.lead_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Same company can manage lead_quotes" ON public.lead_quotes
  FOR ALL USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS lead_quotes_lead_idx ON public.lead_quotes(lead_id);

-- payment_records table
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  motor_quote_id uuid,
  payment_mode text NOT NULL DEFAULT 'online',
  amount numeric(12,2) NOT NULL,
  gst_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  transaction_ref text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  gateway text,
  gateway_ref text,
  status text NOT NULL DEFAULT 'pending',
  receipt_url text,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Same company can manage payment_records" ON public.payment_records
  FOR ALL USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS payment_records_lead_idx ON public.payment_records(lead_id);
CREATE INDEX IF NOT EXISTS payment_records_cust_idx ON public.payment_records(customer_id);

-- Column additions
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS converted_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS renewal_lead_created boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS ncb_percent integer NOT NULL DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_policy_end_date date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS claim_free_years integer NOT NULL DEFAULT 0;
ALTER TABLE public.motor_policies ADD COLUMN IF NOT EXISTS ncb_applied integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posp_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posp_valid_until date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_passed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_date date;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS irdai_rates jsonb;

-- Trigger update: also fire on Converted
CREATE OR REPLACE FUNCTION public.lead_to_customer_on_won()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cust_id uuid;
  _cp_id uuid;
  _new_status text;
  _old_status text;
BEGIN
  _new_status := lower(NEW.status::text);
  _old_status := lower(COALESCE(OLD.status::text,''));
  IF _new_status NOT IN ('won','converted') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND _old_status IN ('won','converted') THEN RETURN NEW; END IF;

  _cust_id := NEW.customer_id;
  IF _cust_id IS NULL THEN
    SELECT id INTO _cust_id FROM public.customers
     WHERE company_id = NEW.company_id AND mobile = NEW.phone_number LIMIT 1;
    IF _cust_id IS NULL THEN
      INSERT INTO public.customers (company_id, full_name, mobile, city, notes, source_lead_id, created_by)
      VALUES (NEW.company_id, NEW.customer_name, NEW.phone_number, NEW.city_village, NEW.notes, NEW.id, NEW.assigned_telecaller)
      RETURNING id INTO _cust_id;
    END IF;
    UPDATE public.leads SET customer_id = _cust_id WHERE id = NEW.id;
  END IF;

  IF NEW.policy_number IS NOT NULL THEN
    SELECT id INTO _cp_id FROM public.customer_products
     WHERE company_id = NEW.company_id AND policy_no = NEW.policy_number LIMIT 1;
  END IF;

  IF NEW.policy_expiry_date IS NOT NULL THEN
    INSERT INTO public.renewals (company_id, customer_id, lead_id, customer_product_id, customer_name, phone_number,
                                 policy_type, policy_number, expiry_date, premium_amount,
                                 original_telecaller_id, assigned_telecaller_id)
    VALUES (NEW.company_id, _cust_id, NEW.id, _cp_id, NEW.customer_name, NEW.phone_number,
            NEW.policy_type::text, NEW.policy_number, NEW.policy_expiry_date, COALESCE(NEW.premium_amount,0),
            NEW.assigned_telecaller, NEW.assigned_telecaller);
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_lead_to_customer_on_won ON public.leads;
CREATE TRIGGER trg_lead_to_customer_on_won
  AFTER INSERT OR UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.lead_to_customer_on_won();

-- leads_stats view: include Policy Issued in done bucket
DROP VIEW IF EXISTS public.leads_stats;
CREATE VIEW public.leads_stats WITH (security_invoker=on) AS
SELECT
  count(*) FILTER (WHERE (status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Policy Issued'::lead_status,'Not Interested'::lead_status])) AND call_date <= CURRENT_DATE) AS to_call,
  count(*) FILTER (WHERE call_date < CURRENT_DATE AND (status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Policy Issued'::lead_status,'Not Interested'::lead_status,'Interested'::lead_status]))) AS overdue,
  count(*) FILTER (WHERE last_called_at IS NULL AND (status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Policy Issued'::lead_status,'Not Interested'::lead_status]))) AS untouched,
  count(*) FILTER (WHERE status = 'Interested'::lead_status) AS interested,
  count(*) FILTER (WHERE status = 'Follow-up'::lead_status) AS follow_up,
  count(*) FILTER (WHERE status = ANY (ARRAY['New'::lead_status,'Not Picked'::lead_status])) AS cold,
  count(*) FILTER (WHERE status = 'Not Picked'::lead_status) AS not_picked,
  count(*) FILTER (WHERE status = 'Quote Sent'::lead_status) AS quote_sent,
  count(*) FILTER (WHERE status = 'Premium Quoted'::lead_status) AS premium_quoted,
  count(*) FILTER (WHERE status = 'Negotiation'::lead_status) AS negotiation,
  count(*) FILTER (WHERE status = 'Converted'::lead_status) AS converted,
  count(*) FILTER (WHERE status = 'Transfer to Senior'::lead_status) AS transfer_to_senior,
  count(*) FILTER (WHERE status = 'Not Interested'::lead_status) AS not_interested,
  count(*) FILTER (WHERE status IN ('Done'::lead_status,'Policy Issued'::lead_status)) AS done,
  count(*) AS total_leads
FROM public.leads;
GRANT SELECT ON public.leads_stats TO authenticated;
