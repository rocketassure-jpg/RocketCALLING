
-- Performance indexes for leads (1 lakh+ rows)
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_area_id ON public.leads(area_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_telecaller ON public.leads(assigned_telecaller);
CREATE INDEX IF NOT EXISTS idx_leads_call_date ON public.leads(call_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_policy_type ON public.leads(policy_type);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_calling_list
  ON public.leads(status, call_date, assigned_telecaller)
  WHERE status NOT IN ('Unsubscribed','Done');
CREATE INDEX IF NOT EXISTS idx_leads_name_search
  ON public.leads USING gin(to_tsvector('simple', customer_name));

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_telecaller_date
  ON public.call_logs(telecaller_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_dial_logs_lead_id ON public.dial_logs(lead_id);

-- Fast aggregate counts via a view (avoids JS-side scans)
CREATE OR REPLACE VIEW public.leads_stats AS
SELECT
  COUNT(*) FILTER (
    WHERE status NOT IN ('Unsubscribed','Done')
      AND call_date <= CURRENT_DATE
  ) AS to_call,
  COUNT(*) FILTER (WHERE status = 'Interested') AS interested,
  COUNT(*) FILTER (WHERE status = 'Follow-up') AS follow_up,
  COUNT(*) FILTER (
    WHERE call_date < CURRENT_DATE
      AND status NOT IN ('Unsubscribed','Done','Interested')
  ) AS overdue,
  COUNT(*) FILTER (
    WHERE id NOT IN (SELECT DISTINCT lead_id FROM public.call_logs WHERE lead_id IS NOT NULL)
  ) AS untouched,
  COUNT(*) FILTER (WHERE status IN ('New','Not Picked')) AS cold,
  COUNT(*) FILTER (WHERE status = 'Done') AS converted,
  COUNT(*) AS total_leads
FROM public.leads;

GRANT SELECT ON public.leads_stats TO authenticated;
GRANT ALL ON public.leads_stats TO service_role;
