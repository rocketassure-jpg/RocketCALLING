-- Add policy expiry date to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS policy_expiry_date date;

-- Add Transfer to Senior to lead_status enum (if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Transfer to Senior' AND enumtypid = 'public.lead_status'::regtype) THEN
    ALTER TYPE public.lead_status ADD VALUE 'Transfer to Senior';
  END IF;
END$$;

-- Lead notes / timeline entries
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  author_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead notes"
  ON public.lead_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author insert lead notes"
  ON public.lead_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Telecallers view notes for their leads"
  ON public.lead_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_notes.lead_id
        AND public.telecaller_has_area(auth.uid(), l.area_id)
    )
  );

CREATE POLICY "Managers view notes for team leads"
  ON public.lead_notes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager') AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_notes.lead_id
        AND public.manager_can_see_lead(auth.uid(), l.area_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_expiry ON public.leads(policy_expiry_date);