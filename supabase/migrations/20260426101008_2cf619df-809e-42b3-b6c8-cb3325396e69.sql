-- Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'telecaller');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Areas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Telecaller <-> Area assignments
CREATE TABLE public.telecaller_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telecaller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  UNIQUE (telecaller_id, area_id)
);
ALTER TABLE public.telecaller_areas ENABLE ROW LEVEL SECURITY;

-- Helper: does telecaller have access to area?
CREATE OR REPLACE FUNCTION public.telecaller_has_area(_user_id UUID, _area_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.telecaller_areas WHERE telecaller_id = _user_id AND area_id = _area_id)
$$;

-- Leads
CREATE TYPE public.lead_status AS ENUM ('New', 'Interested', 'Follow-up', 'Not Picked', 'Not Interested');
CREATE TYPE public.policy_type AS ENUM ('Life', 'Health', 'Motor');

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  policy_type policy_type NOT NULL,
  status lead_status NOT NULL DEFAULT 'New',
  assigned_telecaller UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_called_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Call logs
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  telecaller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status lead_status NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- areas: anyone authenticated can read; admin write
CREATE POLICY "Authenticated view areas" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage areas" ON public.areas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- telecaller_areas
CREATE POLICY "Telecaller view own assignments" ON public.telecaller_areas FOR SELECT USING (auth.uid() = telecaller_id);
CREATE POLICY "Admins view all assignments" ON public.telecaller_areas FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage assignments" ON public.telecaller_areas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- leads
CREATE POLICY "Admins view all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Telecallers view leads in their areas" ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'telecaller') AND public.telecaller_has_area(auth.uid(), area_id));
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Telecallers update leads in their areas" ON public.leads FOR UPDATE
  USING (public.has_role(auth.uid(), 'telecaller') AND public.telecaller_has_area(auth.uid(), area_id))
  WITH CHECK (public.has_role(auth.uid(), 'telecaller') AND public.telecaller_has_area(auth.uid(), area_id));

-- call_logs
CREATE POLICY "Admins view call logs" ON public.call_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Telecallers view own logs" ON public.call_logs FOR SELECT USING (auth.uid() = telecaller_id);
CREATE POLICY "Telecallers insert own logs" ON public.call_logs FOR INSERT
  WITH CHECK (auth.uid() = telecaller_id AND public.has_role(auth.uid(), 'telecaller'));

-- Seed areas
INSERT INTO public.areas (name) VALUES ('Badnawar'), ('Indore'), ('Ujjain'), ('Gajnod'), ('Dhar');