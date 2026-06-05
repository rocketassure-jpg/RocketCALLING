
-- Expand leads_stats view with new bucket counts
DROP VIEW IF EXISTS public.leads_stats;
CREATE VIEW public.leads_stats AS
SELECT
  count(*) FILTER (WHERE status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Not Interested'::lead_status]) AND call_date <= CURRENT_DATE) AS to_call,
  count(*) FILTER (WHERE call_date < CURRENT_DATE AND status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Not Interested'::lead_status,'Interested'::lead_status])) AS overdue,
  count(*) FILTER (WHERE last_called_at IS NULL AND status <> ALL (ARRAY['Unsubscribed'::lead_status,'Done'::lead_status,'Not Interested'::lead_status])) AS untouched,
  count(*) FILTER (WHERE status = 'Interested'::lead_status) AS interested,
  count(*) FILTER (WHERE status = 'Follow-up'::lead_status) AS follow_up,
  count(*) FILTER (WHERE status IN ('New'::lead_status,'Not Picked'::lead_status)) AS cold,
  count(*) FILTER (WHERE status = 'Not Picked'::lead_status) AS not_picked,
  count(*) FILTER (WHERE status = 'Quote Sent'::lead_status) AS quote_sent,
  count(*) FILTER (WHERE status = 'Premium Quoted'::lead_status) AS premium_quoted,
  count(*) FILTER (WHERE status = 'Negotiation'::lead_status) AS negotiation,
  count(*) FILTER (WHERE status = 'Converted'::lead_status) AS converted,
  count(*) FILTER (WHERE status = 'Transfer to Senior'::lead_status) AS transfer_to_senior,
  count(*) FILTER (WHERE status = 'Not Interested'::lead_status) AS not_interested,
  count(*) FILTER (WHERE status = 'Done'::lead_status) AS done,
  count(*) AS total_leads
FROM public.leads;

ALTER VIEW public.leads_stats SET (security_invoker = on);
GRANT SELECT ON public.leads_stats TO authenticated;

-- Message templates table
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'Custom',
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Owner manages own templates
CREATE POLICY "Users manage own templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Everyone authenticated can read shared templates (created by managers/admins for team use)
CREATE POLICY "Read shared templates" ON public.message_templates
  FOR SELECT TO authenticated
  USING (shared = true);

-- Managers and admins can manage shared templates
CREATE POLICY "Managers manage shared templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (shared = true AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')))
  WITH CHECK ((public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')));

CREATE TRIGGER message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
