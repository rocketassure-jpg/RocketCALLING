
-- =========================================================================
-- CRM Audit Phase 1 (retry)
-- =========================================================================

-- 1. Missing FKs on existing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='claims_policy_id_fkey') THEN
    UPDATE public.claims c SET policy_id = NULL
      WHERE policy_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = c.policy_id);
    ALTER TABLE public.claims
      ADD CONSTRAINT claims_policy_id_fkey
      FOREIGN KEY (policy_id) REFERENCES public.customer_products(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='claims_client_lead_id_fkey') THEN
    UPDATE public.claims c SET client_lead_id = NULL
      WHERE client_lead_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = c.client_lead_id);
    ALTER TABLE public.claims
      ADD CONSTRAINT claims_client_lead_id_fkey
      FOREIGN KEY (client_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_products_agent_id_fkey') THEN
    UPDATE public.customer_products cp SET agent_id = NULL
      WHERE agent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.agents_profile a WHERE a.id = cp.agent_id);
    ALTER TABLE public.customer_products
      ADD CONSTRAINT customer_products_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES public.agents_profile(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. New link columns
ALTER TABLE public.renewals             ADD COLUMN IF NOT EXISTS customer_product_id uuid;
ALTER TABLE public.policy_transactions  ADD COLUMN IF NOT EXISTS customer_id         uuid;
ALTER TABLE public.policy_transactions  ADD COLUMN IF NOT EXISTS customer_product_id uuid;
ALTER TABLE public.call_logs            ADD COLUMN IF NOT EXISTS customer_id         uuid;
ALTER TABLE public.whatsapp_logs        ADD COLUMN IF NOT EXISTS customer_id         uuid;
ALTER TABLE public.whatsapp_logs        ADD COLUMN IF NOT EXISTS campaign_id         uuid;
ALTER TABLE public.sms_logs             ADD COLUMN IF NOT EXISTS customer_id         uuid;
ALTER TABLE public.sms_logs             ADD COLUMN IF NOT EXISTS campaign_id         uuid;

-- 3. FKs on new columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='renewals_customer_product_id_fkey') THEN
    ALTER TABLE public.renewals ADD CONSTRAINT renewals_customer_product_id_fkey
      FOREIGN KEY (customer_product_id) REFERENCES public.customer_products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='policy_txn_customer_id_fkey') THEN
    ALTER TABLE public.policy_transactions ADD CONSTRAINT policy_txn_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='policy_txn_customer_product_id_fkey') THEN
    ALTER TABLE public.policy_transactions ADD CONSTRAINT policy_txn_customer_product_id_fkey
      FOREIGN KEY (customer_product_id) REFERENCES public.customer_products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='call_logs_customer_id_fkey') THEN
    ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='whatsapp_logs_customer_id_fkey') THEN
    ALTER TABLE public.whatsapp_logs ADD CONSTRAINT whatsapp_logs_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sms_logs_customer_id_fkey') THEN
    ALTER TABLE public.sms_logs ADD CONSTRAINT sms_logs_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_renewals_customer_product ON public.renewals(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_policy_txn_customer       ON public.policy_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_policy_txn_customer_prod  ON public.policy_transactions(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer        ON public.call_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_customer          ON public.whatsapp_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_campaign          ON public.whatsapp_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer         ON public.sms_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign         ON public.sms_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id          ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_customer_id        ON public.claims(customer_id);

-- 5. Backfills
UPDATE public.policy_transactions pt
SET customer_id = c.id
FROM public.customers c
WHERE pt.customer_id IS NULL
  AND pt.company_id = c.company_id
  AND pt.client_phone IS NOT NULL
  AND regexp_replace(pt.client_phone, '\D', '', 'g') = regexp_replace(COALESCE(c.mobile,''), '\D', '', 'g')
  AND length(regexp_replace(COALESCE(c.mobile,''), '\D', '', 'g')) >= 6;

UPDATE public.policy_transactions pt
SET customer_product_id = cp.id
FROM public.customer_products cp
WHERE pt.customer_product_id IS NULL
  AND pt.company_id = cp.company_id
  AND pt.policy_no IS NOT NULL
  AND pt.policy_no = cp.policy_no;

UPDATE public.call_logs cl SET customer_id = l.customer_id
FROM public.leads l
WHERE cl.customer_id IS NULL AND cl.lead_id = l.id AND l.customer_id IS NOT NULL;

UPDATE public.renewals r SET customer_product_id = cp.id
FROM public.customer_products cp
WHERE r.customer_product_id IS NULL AND r.company_id = cp.company_id
  AND r.policy_number IS NOT NULL AND r.policy_number = cp.policy_no;

UPDATE public.whatsapp_logs w SET customer_id = l.customer_id
FROM public.leads l
WHERE w.customer_id IS NULL AND w.lead_id = l.id AND l.customer_id IS NOT NULL;

UPDATE public.sms_logs s SET customer_id = l.customer_id
FROM public.leads l
WHERE s.customer_id IS NULL AND s.lead_id = l.id AND l.customer_id IS NOT NULL;

-- 6. Lead->Won trigger now also links customer_product_id
CREATE OR REPLACE FUNCTION public.lead_to_customer_on_won()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _cust_id uuid;
  _cp_id uuid;
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

-- 7. Customer 360 summary view
DROP VIEW IF EXISTS public.v_customer_360 CASCADE;
CREATE VIEW public.v_customer_360
WITH (security_invoker = on) AS
SELECT
  c.id AS customer_id, c.company_id, c.full_name, c.mobile, c.city,
  (SELECT COUNT(*) FROM public.customer_products cp WHERE cp.customer_id = c.id) AS products_count,
  (SELECT COALESCE(SUM(premium),0) FROM public.customer_products cp WHERE cp.customer_id = c.id) AS lifetime_premium,
  (SELECT COALESCE(SUM(commission_amount),0) FROM public.customer_products cp WHERE cp.customer_id = c.id) AS lifetime_commission,
  (SELECT COUNT(*) FROM public.claims cl WHERE cl.customer_id = c.id) AS claims_count,
  (SELECT COALESCE(SUM(settled_amount),0) FROM public.claims cl WHERE cl.customer_id = c.id) AS claims_settled_total,
  (SELECT COUNT(*) FROM public.renewals r WHERE r.customer_id = c.id) AS renewals_count,
  (SELECT MIN(r.expiry_date) FROM public.renewals r WHERE r.customer_id = c.id AND r.expiry_date >= CURRENT_DATE) AS next_renewal_date,
  (SELECT COUNT(*) FROM public.call_logs cl WHERE cl.customer_id = c.id) AS calls_count,
  (SELECT MAX(called_at) FROM public.call_logs cl WHERE cl.customer_id = c.id) AS last_call_at,
  (SELECT COUNT(*) FROM public.whatsapp_logs w WHERE w.customer_id = c.id) AS whatsapp_count,
  (SELECT COUNT(*) FROM public.sms_logs s WHERE s.customer_id = c.id) AS sms_count
FROM public.customers c;

GRANT SELECT ON public.v_customer_360 TO authenticated;

-- 8. Unified timeline view — derive company_id via customers
DROP VIEW IF EXISTS public.v_customer_timeline CASCADE;
CREATE VIEW public.v_customer_timeline
WITH (security_invoker = on) AS
SELECT cl.customer_id, c.company_id, 'call'::text AS kind, cl.called_at AS at,
       COALESCE(cl.notes,'Call logged') AS title, cl.status::text AS detail, cl.id AS ref_id
  FROM public.call_logs cl JOIN public.customers c ON c.id = cl.customer_id
UNION ALL
SELECT w.customer_id, c.company_id, 'whatsapp', w.created_at,
       COALESCE(w.message,'WhatsApp'), w.status, w.id
  FROM public.whatsapp_logs w JOIN public.customers c ON c.id = w.customer_id
UNION ALL
SELECT s.customer_id, c.company_id, 'sms', s.created_at,
       COALESCE(s.message,'SMS'), s.status, s.id
  FROM public.sms_logs s JOIN public.customers c ON c.id = s.customer_id
UNION ALL
SELECT cp.customer_id, cp.company_id, 'policy', cp.created_at,
       COALESCE(cp.product_name, cp.category) || ' — ' || COALESCE(cp.policy_no,'no #'),
       cp.status, cp.id
  FROM public.customer_products cp WHERE cp.customer_id IS NOT NULL
UNION ALL
SELECT cl.customer_id, cl.company_id, 'claim', cl.created_at,
       'Claim ' || cl.claim_number, cl.status, cl.id
  FROM public.claims cl WHERE cl.customer_id IS NOT NULL
UNION ALL
SELECT r.customer_id, r.company_id, 'renewal', r.created_at,
       'Renewal — ' || COALESCE(r.policy_number,'no #'), COALESCE(r.status,'pending'), r.id
  FROM public.renewals r WHERE r.customer_id IS NOT NULL;

GRANT SELECT ON public.v_customer_timeline TO authenticated;
