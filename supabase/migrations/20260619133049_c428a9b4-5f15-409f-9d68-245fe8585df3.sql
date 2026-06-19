
-- system_config: global key-value store (super admin only)
CREATE TABLE IF NOT EXISTS public.system_config (
  key_name text PRIMARY KEY,
  key_value text,
  is_secret boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config TO authenticated;
GRANT ALL ON public.system_config TO service_role;

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config super admin read"
  ON public.system_config FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "system_config super admin write"
  ON public.system_config FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER system_config_set_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- status_mappings: per-company lead statuses
CREATE TABLE IF NOT EXISTS public.status_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status_key text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#10b981',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, status_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_mappings TO authenticated;
GRANT ALL ON public.status_mappings TO service_role;

ALTER TABLE public.status_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_mappings company read"
  ON public.status_mappings FOR SELECT TO authenticated
  USING (company_id = public.user_company_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "status_mappings admin write"
  ON public.status_mappings FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin'))
  );

CREATE TRIGGER status_mappings_set_updated_at
  BEFORE UPDATE ON public.status_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER status_mappings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.status_mappings
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

CREATE TRIGGER system_config_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- Seed default statuses for all existing companies
INSERT INTO public.status_mappings (company_id, status_key, label, color, sort_order)
SELECT c.id, s.status_key, s.label, s.color, s.sort_order
FROM public.companies c
CROSS JOIN (VALUES
  ('to_call',          'To Call',            '#3b82f6',  1),
  ('overdue',          'Overdue',            '#ef4444',  2),
  ('untouched',        'Untouched',          '#94a3b8',  3),
  ('interested',       'Interested',         '#10b981',  4),
  ('follow_up',        'Follow-up',          '#f59e0b',  5),
  ('cold',             'Cold',               '#64748b',  6),
  ('not_picked',       'Not Picked',         '#f97316',  7),
  ('quote_sent',       'Quote Sent',         '#06b6d4',  8),
  ('premium_quoted',   'Premium Quoted',     '#0ea5e9',  9),
  ('negotiation',      'Negotiation',        '#8b5cf6', 10),
  ('converted',        'Converted',          '#22c55e', 11),
  ('transfer_senior',  'Transfer to Senior', '#a855f7', 12),
  ('not_interested',   'Not Interested',     '#dc2626', 13),
  ('done',             'Done',               '#16a34a', 14)
) AS s(status_key, label, color, sort_order)
ON CONFLICT (company_id, status_key) DO NOTHING;
