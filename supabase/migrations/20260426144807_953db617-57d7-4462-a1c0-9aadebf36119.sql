-- profiles: manager link
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- leads: scheduling + revenue
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS call_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS premium_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS leads_call_date_idx ON public.leads(call_date);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);

-- dial_logs
CREATE TABLE IF NOT EXISTS public.dial_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  telecaller_id uuid NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dial_logs ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_id uuid, _telecaller_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _telecaller_id AND manager_id = _manager_id)
$$;

CREATE OR REPLACE FUNCTION public.manager_can_see_lead(_manager_id uuid, _area_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.telecaller_areas ta
    JOIN public.profiles p ON p.id = ta.telecaller_id
    WHERE ta.area_id = _area_id AND p.manager_id = _manager_id
  )
$$;

-- dial_logs RLS
CREATE POLICY "Telecallers insert own dial logs" ON public.dial_logs
  FOR INSERT WITH CHECK (auth.uid() = telecaller_id);
CREATE POLICY "Telecallers view own dial logs" ON public.dial_logs
  FOR SELECT USING (auth.uid() = telecaller_id);
CREATE POLICY "Admins view all dial logs" ON public.dial_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers view team dial logs" ON public.dial_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), telecaller_id));

-- Manager access on existing tables
CREATE POLICY "Managers view team profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'manager') AND (id = auth.uid() OR manager_id = auth.uid()));

CREATE POLICY "Managers view team leads" ON public.leads
  FOR SELECT USING (public.has_role(auth.uid(), 'manager') AND public.manager_can_see_lead(auth.uid(), area_id));

CREATE POLICY "Managers update team leads" ON public.leads
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager') AND public.manager_can_see_lead(auth.uid(), area_id))
  WITH CHECK (public.has_role(auth.uid(), 'manager') AND public.manager_can_see_lead(auth.uid(), area_id));

CREATE POLICY "Managers view team call logs" ON public.call_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), telecaller_id));

CREATE POLICY "Managers view areas" ON public.areas
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers view team assignments" ON public.telecaller_areas
  FOR SELECT USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), telecaller_id));