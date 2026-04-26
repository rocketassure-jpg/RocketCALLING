-- Enquiries from public landing page
CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  vehicle_number text,
  insurance_type public.policy_type NOT NULL DEFAULT 'Motor',
  message text,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an enquiry (public form)
CREATE POLICY "Anyone can create enquiries"
ON public.enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins see and manage all
CREATE POLICY "Admins view enquiries"
ON public.enquiries
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update enquiries"
ON public.enquiries
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete enquiries"
ON public.enquiries
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Managers see all enquiries (so they can route them to telecallers)
CREATE POLICY "Managers view enquiries"
ON public.enquiries
FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers update enquiries"
ON public.enquiries
FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_enquiries_handled_created ON public.enquiries (handled, created_at DESC);