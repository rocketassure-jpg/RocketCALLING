
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_expiry ON public.leads(policy_expiry_date);
CREATE INDEX IF NOT EXISTS idx_leads_manager ON public.leads(manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON public.call_logs(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_telecaller_date ON public.call_logs(telecaller_id, called_at);

CREATE OR REPLACE VIEW public.untouched_leads
WITH (security_invoker = true) AS
SELECT l.*
FROM public.leads l
WHERE l.id NOT IN (SELECT DISTINCT lead_id FROM public.call_logs WHERE lead_id IS NOT NULL)
  AND l.status <> 'Unsubscribed'::lead_status;

CREATE OR REPLACE VIEW public.renewal_leads
WITH (security_invoker = true) AS
SELECT l.*,
  CASE
    WHEN l.policy_expiry_date = CURRENT_DATE THEN 'today'
    WHEN l.policy_expiry_date <= CURRENT_DATE + 7 THEN 'this_week'
    WHEN l.policy_expiry_date <= CURRENT_DATE + 30 THEN 'this_month'
    ELSE 'later'
  END AS urgency
FROM public.leads l
WHERE l.policy_expiry_date >= CURRENT_DATE
ORDER BY l.policy_expiry_date ASC;
