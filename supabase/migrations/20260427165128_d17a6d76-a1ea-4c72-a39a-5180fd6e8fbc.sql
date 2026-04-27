
-- Break logs for agent idle tracking
CREATE TABLE public.break_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telecaller_id uuid NOT NULL,
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.break_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telecallers manage own breaks" ON public.break_logs
  FOR ALL USING (auth.uid() = telecaller_id) WITH CHECK (auth.uid() = telecaller_id);
CREATE POLICY "Admins view all breaks" ON public.break_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers view team breaks" ON public.break_logs
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), telecaller_id));

-- Add call_type to dial_logs for Connected/Not Connected/Personal bucket
ALTER TABLE public.dial_logs ADD COLUMN IF NOT EXISTS call_type text NOT NULL DEFAULT 'Outbound';
ALTER TABLE public.dial_logs ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE public.dial_logs ADD COLUMN IF NOT EXISTS connected boolean NOT NULL DEFAULT false;
