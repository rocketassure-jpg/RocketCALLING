
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS logo_url text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='companies' AND policyname='Admins update own company'
  ) THEN
    CREATE POLICY "Admins update own company" ON public.companies
      FOR UPDATE TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) AND id = user_company_id())
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND id = user_company_id());
  END IF;
END $$;

ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS channels text[] NOT NULL DEFAULT ARRAY['whatsapp']::text[];
