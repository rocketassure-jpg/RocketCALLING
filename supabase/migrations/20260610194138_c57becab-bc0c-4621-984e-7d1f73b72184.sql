
-- ============================================================
-- PHASE 1: Multi-tenant + module subscription foundation
-- ============================================================

-- 1) COMPANIES ----------------------------------------------------
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) MODULES catalog ---------------------------------------------
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  base_monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_always_included BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.modules TO authenticated, anon;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

INSERT INTO public.modules (module_key, name, description, icon, base_monthly_price, base_yearly_price, is_always_included, sort_order) VALUES
  ('telecaller_crm','Telecaller CRM','Lead management, dialer, dispositions, team',  'Phone',     999,  9999, true,  1),
  ('accounts','Accounts & Commission','Insurer master, commissions, payouts, TDS',     'Wallet',      0,     0, true,  2),
  ('motor_insurance','Motor Insurance','Vehicle policies, PUC/Fitness/Permit/RC',     'Car',       799,  7999, false, 3),
  ('health_insurance','Health Insurance','Individual, family floater, group',          'HeartPulse',599,  5999, false, 4),
  ('life_insurance','Life Insurance','Term, endowment, ULIP, premium calendar',       'Shield',    599,  5999, false, 5),
  ('rto_services','RTO Services','RC/HP/NOC/Permit/DL case tracking',                  'Landmark',  499,  4999, false, 6);

-- 3) COMPANY SUBSCRIPTIONS ---------------------------------------
CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.modules(module_key) ON DELETE RESTRICT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly|yearly|trial|lifetime|custom
  price_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = lifetime
  status TEXT NOT NULL DEFAULT 'active', -- active|trial|expired|cancelled
  activated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_subscriptions TO authenticated;
GRANT ALL ON public.company_subscriptions TO service_role;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) ADD company_id + is_super_admin -----------------------------
ALTER TABLE public.profiles
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.leads          ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.areas          ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings   ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5) SEED Default Company + backfill -----------------------------
DO $$
DECLARE
  v_default_co UUID;
  v_first_admin UUID;
BEGIN
  -- only seed if no companies exist
  IF NOT EXISTS (SELECT 1 FROM public.companies) THEN
    SELECT ur.user_id INTO v_first_admin
      FROM public.user_roles ur
      WHERE ur.role = 'admin'
      ORDER BY (SELECT created_at FROM public.profiles WHERE id = ur.user_id) ASC
      LIMIT 1;

    INSERT INTO public.companies (name, code, plan, created_by, notes)
    VALUES ('Rocket Services', 'ROCKET', 'lifetime', v_first_admin, 'Default company — auto-created during multi-tenant migration')
    RETURNING id INTO v_default_co;

    -- promote first admin to super_admin
    IF v_first_admin IS NOT NULL THEN
      UPDATE public.profiles SET is_super_admin = true WHERE id = v_first_admin;
    END IF;

    -- backfill
    UPDATE public.profiles      SET company_id = v_default_co WHERE company_id IS NULL;
    UPDATE public.leads         SET company_id = v_default_co WHERE company_id IS NULL;
    UPDATE public.areas         SET company_id = v_default_co WHERE company_id IS NULL;
    UPDATE public.app_settings  SET company_id = v_default_co WHERE company_id IS NULL;

    -- give the default company the base bundle + all modules (lifetime)
    INSERT INTO public.company_subscriptions (company_id, module_key, billing_cycle, status, end_date)
    SELECT v_default_co, module_key, 'lifetime', 'active', NULL FROM public.modules;
  END IF;
END $$;

-- now enforce NOT NULL where it makes sense
ALTER TABLE public.profiles     ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.leads        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.areas        ALTER COLUMN company_id SET NOT NULL;
-- app_settings stays nullable (legacy single-row may still be used)

CREATE INDEX idx_profiles_company   ON public.profiles(company_id);
CREATE INDEX idx_leads_company      ON public.leads(company_id);
CREATE INDEX idx_areas_company      ON public.areas(company_id);
CREATE INDEX idx_cs_company         ON public.company_subscriptions(company_id);

-- 6) HELPER FUNCTIONS --------------------------------------------
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.has_module(_company_id UUID, _module_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_subscriptions
    WHERE company_id = _company_id
      AND module_key = _module_key
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_active_modules(_company_id UUID)
RETURNS TEXT[]
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(module_key ORDER BY module_key), ARRAY[]::TEXT[])
  FROM public.company_subscriptions
  WHERE company_id = _company_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
$$;

-- 7) RLS POLICIES ------------------------------------------------
-- companies
CREATE POLICY "Users view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.user_company_id() OR public.is_super_admin());

CREATE POLICY "Super admin manages companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- modules: read-only catalog for everyone signed in
CREATE POLICY "Anyone reads modules" ON public.modules
  FOR SELECT USING (true);

CREATE POLICY "Super admin manages modules" ON public.modules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- company_subscriptions: company members read theirs; super-admin manages all
CREATE POLICY "Users view own subscriptions" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() OR public.is_super_admin());

CREATE POLICY "Super admin manages subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 8) RPCs for signup company flow --------------------------------
CREATE OR REPLACE FUNCTION public.lookup_company_by_code(_code TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name FROM public.companies
  WHERE upper(code) = upper(_code) AND is_active = true
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.lookup_company_by_code(TEXT) TO anon, authenticated;

-- 9) Updated handle_new_user --------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_first BOOLEAN;
  _req TEXT;
  _company_code TEXT;
  _create_company TEXT;
  _company_name TEXT;
  _company_id UUID;
  _new_code TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  _req            := NEW.raw_user_meta_data->>'requested_role';
  _company_code   := NEW.raw_user_meta_data->>'company_code';
  _create_company := NEW.raw_user_meta_data->>'create_company';
  _company_name   := NEW.raw_user_meta_data->>'company_name';

  -- Resolve company
  IF _company_code IS NOT NULL AND length(_company_code) > 0 THEN
    SELECT id INTO _company_id FROM public.companies WHERE upper(code) = upper(_company_code) AND is_active = true LIMIT 1;
  END IF;

  IF _company_id IS NULL AND _create_company = 'true' AND _company_name IS NOT NULL THEN
    _new_code := upper(regexp_replace(_company_name,'[^a-zA-Z0-9]','','g'));
    IF length(_new_code) < 3 THEN _new_code := _new_code || substr(md5(NEW.id::text),1,6); END IF;
    -- guarantee uniqueness
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE code = _new_code) LOOP
      _new_code := _new_code || substr(md5(random()::text),1,2);
    END LOOP;
    INSERT INTO public.companies (name, code, created_by) VALUES (_company_name, _new_code, NEW.id) RETURNING id INTO _company_id;
    -- give new company base bundle + all modules trial
    INSERT INTO public.company_subscriptions (company_id, module_key, billing_cycle, status, end_date)
    SELECT _company_id, module_key,
      CASE WHEN is_always_included THEN 'lifetime' ELSE 'trial' END,
      'active',
      CASE WHEN is_always_included THEN NULL ELSE CURRENT_DATE + INTERVAL '14 days' END
    FROM public.modules;
  END IF;

  IF _company_id IS NULL THEN
    SELECT id INTO _company_id FROM public.companies WHERE code = 'ROCKET' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, department, requested_role, is_approved, is_active, company_id, is_super_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'department',
    _req,
    true,
    true,
    _company_id,
    _is_first
  );

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSIF _create_company = 'true' THEN
    -- creator of a brand-new company is its admin
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NULLIF(_req,''),'telecaller')::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
