
-- ============== CUSTOMERS: new business + lifecycle fields ==============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS customer_since timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS value_score numeric(10,2) NOT NULL DEFAULT 0;

-- ============== FAMILY MEMBERS ==============
CREATE TABLE IF NOT EXISTS public.customer_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relation text NOT NULL,           -- spouse / son / daughter / father / mother / dependent / other
  dob date,
  gender text,
  mobile text,
  is_dependent boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_family_members TO authenticated;
GRANT ALL ON public.customer_family_members TO service_role;
ALTER TABLE public.customer_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fam company read"   ON public.customer_family_members FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "fam company insert" ON public.customer_family_members FOR INSERT TO authenticated WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "fam company update" ON public.customer_family_members FOR UPDATE TO authenticated USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "fam company delete" ON public.customer_family_members FOR DELETE TO authenticated USING (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_fam_customer ON public.customer_family_members(customer_id);
CREATE TRIGGER trg_fam_updated_at BEFORE UPDATE ON public.customer_family_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== CONTACTS (business customers) ==============
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  designation text,
  mobile text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctc company read"   ON public.customer_contacts FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "ctc company insert" ON public.customer_contacts FOR INSERT TO authenticated WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "ctc company update" ON public.customer_contacts FOR UPDATE TO authenticated USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "ctc company delete" ON public.customer_contacts FOR DELETE TO authenticated USING (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_ctc_customer ON public.customer_contacts(customer_id);
CREATE TRIGGER trg_ctc_updated_at BEFORE UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== LIFECYCLE EVENTS ==============
CREATE TABLE IF NOT EXISTS public.customer_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stage text NOT NULL,             -- lead/prospect/customer/policy_holder/multi_product/renewal/claim/loyal
  source_ref text,                 -- e.g. product:<id>, claim:<id>, renewal:<id>
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT ON public.customer_lifecycle_events TO authenticated;
GRANT ALL ON public.customer_lifecycle_events TO service_role;
ALTER TABLE public.customer_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lce company read"   ON public.customer_lifecycle_events FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "lce company insert" ON public.customer_lifecycle_events FOR INSERT TO authenticated WITH CHECK (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_lce_customer ON public.customer_lifecycle_events(customer_id, occurred_at DESC);

-- ============== CUSTOMER TASKS ==============
CREATE TABLE IF NOT EXISTS public.customer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  related_product_id uuid REFERENCES public.customer_products(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'followup',
  title text NOT NULL,
  description text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',  -- open / done / cancelled
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tasks TO authenticated;
GRANT ALL ON public.customer_tasks TO service_role;
ALTER TABLE public.customer_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct company read"   ON public.customer_tasks FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "ct company insert" ON public.customer_tasks FOR INSERT TO authenticated WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "ct company update" ON public.customer_tasks FOR UPDATE TO authenticated USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "ct company delete" ON public.customer_tasks FOR DELETE TO authenticated USING (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_ct_customer ON public.customer_tasks(customer_id, status);
CREATE TRIGGER trg_ct_updated_at BEFORE UPDATE ON public.customer_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== CUSTOMER NOTES ==============
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cn company read"   ON public.customer_notes FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "cn company insert" ON public.customer_notes FOR INSERT TO authenticated WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "cn company update" ON public.customer_notes FOR UPDATE TO authenticated USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "cn company delete" ON public.customer_notes FOR DELETE TO authenticated USING (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_cn_customer ON public.customer_notes(customer_id, created_at DESC);

-- ============== CROSS-SELL SUGGESTIONS (cache) ==============
CREATE TABLE IF NOT EXISTS public.cross_sell_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  missing_category text NOT NULL,
  score numeric(6,2) NOT NULL DEFAULT 0,
  reason text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, missing_category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_sell_suggestions TO authenticated;
GRANT ALL ON public.cross_sell_suggestions TO service_role;
ALTER TABLE public.cross_sell_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "css company read"   ON public.cross_sell_suggestions FOR SELECT TO authenticated USING (company_id = public.user_company_id());
CREATE POLICY "css company write"  ON public.cross_sell_suggestions FOR ALL    TO authenticated USING (company_id = public.user_company_id()) WITH CHECK (company_id = public.user_company_id());
CREATE INDEX IF NOT EXISTS idx_css_customer ON public.cross_sell_suggestions(customer_id);

-- ============== LIFECYCLE TRIGGERS ==============
CREATE OR REPLACE FUNCTION public.log_lifecycle_on_customer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.customer_lifecycle_events (company_id, customer_id, stage, source_ref, notes, created_by)
  VALUES (NEW.company_id, NEW.id, 'customer', 'customer:'||NEW.id::text, 'Customer profile created', NEW.created_by);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_lifecycle_customer ON public.customers;
CREATE TRIGGER trg_log_lifecycle_customer AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.log_lifecycle_on_customer();

CREATE OR REPLACE FUNCTION public.log_lifecycle_on_product()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cnt int; _stage text;
BEGIN
  SELECT count(*) INTO _cnt FROM public.customer_products WHERE customer_id = NEW.customer_id;
  _stage := CASE WHEN _cnt >= 2 THEN 'multi_product' ELSE 'policy_holder' END;
  INSERT INTO public.customer_lifecycle_events (company_id, customer_id, stage, source_ref, notes, created_by)
  VALUES (NEW.company_id, NEW.customer_id, _stage, 'product:'||NEW.id::text,
          'Product added: '||COALESCE(NEW.product_name, NEW.category), NEW.created_by);
  UPDATE public.customers SET lifecycle_stage = _stage WHERE id = NEW.customer_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_lifecycle_product ON public.customer_products;
CREATE TRIGGER trg_log_lifecycle_product AFTER INSERT ON public.customer_products
  FOR EACH ROW EXECUTE FUNCTION public.log_lifecycle_on_product();

CREATE OR REPLACE FUNCTION public.log_lifecycle_on_claim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.customer_lifecycle_events (company_id, customer_id, stage, source_ref, notes, created_by)
  VALUES (NEW.company_id, NEW.customer_id, 'claim', 'claim:'||NEW.id::text,
          'Claim filed: '||COALESCE(NEW.claim_no,''), NEW.created_by);
  UPDATE public.customers SET lifecycle_stage = 'claim' WHERE id = NEW.customer_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_lifecycle_claim ON public.claims;
CREATE TRIGGER trg_log_lifecycle_claim AFTER INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.log_lifecycle_on_claim();

CREATE OR REPLACE FUNCTION public.log_lifecycle_on_renewal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.customer_lifecycle_events (company_id, customer_id, stage, source_ref, notes)
  VALUES (NEW.company_id, NEW.customer_id, 'renewal', 'renewal:'||NEW.id::text,
          'Renewal created for policy '||COALESCE(NEW.policy_number,''));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_lifecycle_renewal ON public.renewals;
CREATE TRIGGER trg_log_lifecycle_renewal AFTER INSERT ON public.renewals
  FOR EACH ROW EXECUTE FUNCTION public.log_lifecycle_on_renewal();

-- ============== VALUE SCORE RECOMPUTE (on product write) ==============
CREATE OR REPLACE FUNCTION public.recompute_customer_value(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _premium numeric; _claims int; _tenure_days int; _score numeric;
BEGIN
  SELECT COALESCE(sum(premium),0) INTO _premium FROM public.customer_products WHERE customer_id = _customer_id;
  SELECT count(*) INTO _claims FROM public.claims WHERE customer_id = _customer_id;
  SELECT GREATEST(0, EXTRACT(EPOCH FROM (now() - customer_since))/86400)::int
    INTO _tenure_days FROM public.customers WHERE id = _customer_id;
  _score := round( (_premium/1000.0) + (_tenure_days/30.0)*2 + GREATEST(0, 10 - _claims*2), 2);
  UPDATE public.customers SET value_score = _score WHERE id = _customer_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_value_on_product()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_customer_value(COALESCE(NEW.customer_id, OLD.customer_id));
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_recompute_value ON public.customer_products;
CREATE TRIGGER trg_recompute_value AFTER INSERT OR UPDATE OR DELETE ON public.customer_products
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_value_on_product();

-- ============== CROSS-SELL COMPUTE ==============
CREATE OR REPLACE FUNCTION public.compute_cross_sell(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid uuid;
  _owned text[];
  _all text[] := ARRAY['motor','health','life','term','travel','property','fire','marine','shopkeeper','liability','sip','mutual_fund','fd','personal_loan','home_loan','business_loan','credit_card','fastag','rsa'];
  _missing text;
BEGIN
  SELECT company_id INTO _cid FROM public.customers WHERE id = _customer_id;
  IF _cid IS NULL THEN RETURN; END IF;
  SELECT COALESCE(array_agg(DISTINCT category),'{}') INTO _owned FROM public.customer_products WHERE customer_id = _customer_id;

  DELETE FROM public.cross_sell_suggestions WHERE customer_id = _customer_id;
  FOREACH _missing IN ARRAY _all LOOP
    IF NOT (_missing = ANY(_owned)) THEN
      INSERT INTO public.cross_sell_suggestions (company_id, customer_id, missing_category, score, reason)
      VALUES (_cid, _customer_id, _missing,
        CASE _missing
          WHEN 'health' THEN 90 WHEN 'term' THEN 85 WHEN 'motor' THEN 80
          WHEN 'life' THEN 75 WHEN 'home_loan' THEN 60 ELSE 50 END,
        'Customer does not own '||_missing||' yet');
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_cross_sell_on_product()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.compute_cross_sell(COALESCE(NEW.customer_id, OLD.customer_id));
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_cross_sell ON public.customer_products;
CREATE TRIGGER trg_cross_sell AFTER INSERT OR UPDATE OR DELETE ON public.customer_products
  FOR EACH ROW EXECUTE FUNCTION public.trg_cross_sell_on_product();

-- Seed cross-sell for existing customers
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.customers LOOP
    PERFORM public.compute_cross_sell(r.id);
    PERFORM public.recompute_customer_value(r.id);
  END LOOP;
END $$;

-- ============== EXTEND v_customer_360 ==============
DROP VIEW IF EXISTS public.v_customer_360 CASCADE;
CREATE VIEW public.v_customer_360 WITH (security_invoker=on) AS
SELECT
  c.id AS customer_id,
  c.company_id,
  c.full_name,
  c.mobile,
  c.email,
  c.lifecycle_stage,
  c.value_score,
  c.customer_since,
  COALESCE(p.products_count, 0) AS products_count,
  COALESCE(p.lifetime_premium, 0) AS lifetime_premium,
  COALESCE(p.lifetime_commission, 0) AS lifetime_commission,
  COALESCE(cl.claims_count, 0) AS claims_count,
  COALESCE(rn.renewals_count, 0) AS renewals_count,
  COALESCE(fm.family_count, 0) AS family_count,
  COALESCE(ct.contacts_count, 0) AS contacts_count,
  COALESCE(cs.missing_categories, '{}') AS missing_categories
FROM public.customers c
LEFT JOIN (
  SELECT customer_id, count(*) AS products_count,
         sum(premium) AS lifetime_premium, sum(commission_amount) AS lifetime_commission
  FROM public.customer_products GROUP BY customer_id
) p ON p.customer_id = c.id
LEFT JOIN (SELECT customer_id, count(*) AS claims_count FROM public.claims GROUP BY customer_id) cl ON cl.customer_id = c.id
LEFT JOIN (SELECT customer_id, count(*) AS renewals_count FROM public.renewals GROUP BY customer_id) rn ON rn.customer_id = c.id
LEFT JOIN (SELECT customer_id, count(*) AS family_count FROM public.customer_family_members GROUP BY customer_id) fm ON fm.customer_id = c.id
LEFT JOIN (SELECT customer_id, count(*) AS contacts_count FROM public.customer_contacts GROUP BY customer_id) ct ON ct.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, array_agg(missing_category ORDER BY score DESC) AS missing_categories
  FROM public.cross_sell_suggestions GROUP BY customer_id
) cs ON cs.customer_id = c.id;

GRANT SELECT ON public.v_customer_360 TO authenticated;

-- Backfill lifecycle_stage based on existing data
UPDATE public.customers c
SET lifecycle_stage = CASE
  WHEN EXISTS (SELECT 1 FROM public.claims cl WHERE cl.customer_id = c.id) THEN 'claim'
  WHEN (SELECT count(*) FROM public.customer_products cp WHERE cp.customer_id = c.id) >= 2 THEN 'multi_product'
  WHEN EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.customer_id = c.id) THEN 'policy_holder'
  ELSE 'customer'
END
WHERE lifecycle_stage = 'customer';
