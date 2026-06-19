CREATE TABLE IF NOT EXISTS public.export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL CHECK (export_type IN ('blueprint','code','full')),
  file_url text,
  file_size_bytes bigint,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT ON public.export_history TO authenticated;
GRANT ALL ON public.export_history TO service_role;

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read export history"
  ON public.export_history FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Super admins insert export history"
  ON public.export_history FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_export_history_generated_at ON public.export_history(generated_at DESC);
