
CREATE TABLE IF NOT EXISTS public.customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  category text NOT NULL,
  sub_category text,
  product_name text,
  insurer_or_vendor text,
  policy_no text,
  premium numeric(14,2) DEFAULT 0,
  customer_price numeric(14,2) DEFAULT 0,
  govt_or_cost_fee numeric(14,2) DEFAULT 0,
  start_date date,
  expiry_date date,
  status text DEFAULT 'active',
  commission_rate numeric(6,3) DEFAULT 0,
  commission_amount numeric(14,2) DEFAULT 0,
  agent_share_pct numeric(6,3) DEFAULT 60,
  branch_share_pct numeric(6,3) DEFAULT 20,
  admin_share_pct numeric(6,3) DEFAULT 20,
  agent_share numeric(14,2) DEFAULT 0,
  branch_share numeric(14,2) DEFAULT 0,
  admin_share numeric(14,2) DEFAULT 0,
  gst_amount numeric(14,2) DEFAULT 0,
  tds_amount numeric(14,2) DEFAULT 0,
  margin numeric(14,2) DEFAULT 0,
  profit numeric(14,2) DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  agent_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_products_customer ON public.customer_products(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_company ON public.customer_products(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_expiry ON public.customer_products(expiry_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_products TO authenticated;
GRANT ALL ON public.customer_products TO service_role;

ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp company read"
  ON public.customer_products FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());

CREATE POLICY "cp company insert"
  ON public.customer_products FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "cp company update"
  ON public.customer_products FOR UPDATE TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "cp admin delete"
  ON public.customer_products FOR DELETE TO authenticated
  USING (company_id = public.user_company_id()
         AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));

CREATE OR REPLACE FUNCTION public.customer_product_autocalc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _base numeric;
  _total_pct numeric;
BEGIN
  -- For RTO / Finance use customer_price - govt fee as margin; commission flows from premium otherwise
  IF NEW.category IN ('rto','finance') THEN
    NEW.margin := COALESCE(NEW.customer_price,0) - COALESCE(NEW.govt_or_cost_fee,0);
    NEW.profit := NEW.margin - COALESCE(NEW.agent_share,0);
    IF NEW.commission_amount IS NULL OR NEW.commission_amount = 0 THEN
      NEW.commission_amount := NEW.margin;
    END IF;
    _base := NEW.commission_amount;
  ELSE
    _base := COALESCE(NEW.premium,0);
    IF (NEW.commission_amount IS NULL OR NEW.commission_amount = 0) AND COALESCE(NEW.commission_rate,0) > 0 THEN
      NEW.commission_amount := round(_base * NEW.commission_rate / 100.0, 2);
    END IF;
    -- GST 18% of commission if not set
    IF NEW.gst_amount IS NULL OR NEW.gst_amount = 0 THEN
      NEW.gst_amount := round(COALESCE(NEW.commission_amount,0) * 0.18, 2);
    END IF;
    -- TDS 5% (Sec 194D)
    IF NEW.tds_amount IS NULL OR NEW.tds_amount = 0 THEN
      NEW.tds_amount := round(COALESCE(NEW.commission_amount,0) * 0.05, 2);
    END IF;
  END IF;

  -- Normalize split pcts (default 60/20/20 if all zero)
  IF COALESCE(NEW.agent_share_pct,0) + COALESCE(NEW.branch_share_pct,0) + COALESCE(NEW.admin_share_pct,0) = 0 THEN
    NEW.agent_share_pct := 60; NEW.branch_share_pct := 20; NEW.admin_share_pct := 20;
  END IF;
  _total_pct := NEW.agent_share_pct + NEW.branch_share_pct + NEW.admin_share_pct;

  NEW.agent_share  := round(COALESCE(NEW.commission_amount,0) * NEW.agent_share_pct  / _total_pct, 2);
  NEW.branch_share := round(COALESCE(NEW.commission_amount,0) * NEW.branch_share_pct / _total_pct, 2);
  NEW.admin_share  := round(COALESCE(NEW.commission_amount,0) * NEW.admin_share_pct  / _total_pct, 2);

  IF NEW.category NOT IN ('rto','finance') THEN
    NEW.profit := COALESCE(NEW.commission_amount,0) - NEW.agent_share - NEW.branch_share - NEW.admin_share;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_customer_product_autocalc ON public.customer_products;
CREATE TRIGGER trg_customer_product_autocalc
BEFORE INSERT OR UPDATE ON public.customer_products
FOR EACH ROW EXECUTE FUNCTION public.customer_product_autocalc();
