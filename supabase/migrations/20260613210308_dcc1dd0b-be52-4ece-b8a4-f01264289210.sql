
-- ============================================================
-- PHASE M: SECURITY HARDENING
-- ============================================================

-- Fix SECURITY DEFINER view (unified_policies missing security_invoker)
ALTER VIEW IF EXISTS public.unified_policies SET (security_invoker = on);

-- Revoke anon EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_company_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_branch_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_active_modules(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_module(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.telecaller_has_area(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.manager_can_see_lead(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_applicable_slab(uuid, text, numeric, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_invite_code() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_modules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.telecaller_has_area(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_can_see_lead(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applicable_slab(uuid, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_code() TO authenticated;

-- ============================================================
-- PHASE N: pg_cron + pg_net schedules
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule prior versions if present (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'renewal-reminders-daily';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'renewal-reminders-daily',
  '30 2 * * *',  -- daily 02:30 UTC = 08:00 IST
  $$
  SELECT net.http_post(
    url := 'https://lgqgnsngxhqdzpstiddj.supabase.co/functions/v1/renewal-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncWduc25neGhxZHpwc3RpZGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTM2NTksImV4cCI6MjA5Mjc2OTY1OX0.P1GOBl3rK3P4gtzzp7B68c9zdw4mTo0_H-R6U0Dv5_Q"}'::jsonb,
    body := jsonb_build_object('source','cron','ts', now())
  );
  $$
);

-- ============================================================
-- PHASE O: INSURANCE COMPLIANCE TRIGGERS
-- ============================================================

-- 1) GST + TDS auto-calc on policy_transactions
CREATE OR REPLACE FUNCTION public.policy_txn_autocalc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _net numeric;
BEGIN
  -- Net premium = OD + TP if missing
  IF NEW.net_premium IS NULL OR NEW.net_premium = 0 THEN
    NEW.net_premium := COALESCE(NEW.od_premium,0) + COALESCE(NEW.tp_premium,0);
  END IF;
  _net := COALESCE(NEW.net_premium, 0);

  -- GST = 18% of net if missing
  IF (NEW.gst_amount IS NULL OR NEW.gst_amount = 0) AND _net > 0 THEN
    NEW.gst_amount := round(_net * 0.18, 2);
  END IF;

  -- Gross = net + gst if missing
  IF NEW.gross_premium IS NULL OR NEW.gross_premium = 0 THEN
    NEW.gross_premium := COALESCE(NEW.net_premium,0) + COALESCE(NEW.gst_amount,0);
  END IF;

  -- TDS = 5% of commission (Sec 194D) if missing
  IF (NEW.tds_amount IS NULL OR NEW.tds_amount = 0) AND COALESCE(NEW.commission_amount,0) > 0 THEN
    NEW.tds_amount := round(NEW.commission_amount * 0.05, 2);
  END IF;

  -- Agent payout = commission - tds if missing
  IF (NEW.agent_payout IS NULL OR NEW.agent_payout = 0) AND COALESCE(NEW.commission_amount,0) > 0 THEN
    NEW.agent_payout := COALESCE(NEW.commission_amount,0) - COALESCE(NEW.tds_amount,0);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_policy_txn_autocalc ON public.policy_transactions;
CREATE TRIGGER trg_policy_txn_autocalc
BEFORE INSERT OR UPDATE ON public.policy_transactions
FOR EACH ROW EXECUTE FUNCTION public.policy_txn_autocalc();

-- 2) Unique policy number per insurer per company (IRDAI dedup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_txn_unique_per_insurer
  ON public.policy_transactions (company_id, insurer_id, policy_no)
  WHERE policy_no IS NOT NULL AND insurer_id IS NOT NULL;

-- 3) Claim SLA due date column + auto-populate
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.claim_set_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _days int;
BEGIN
  IF NEW.sla_due_at IS NULL AND NEW.intimation_date IS NOT NULL THEN
    _days := CASE lower(COALESCE(NEW.policy_type,''))
      WHEN 'health' THEN 7
      WHEN 'motor'  THEN 15
      WHEN 'life'   THEN 30
      ELSE 15
    END;
    NEW.sla_due_at := (NEW.intimation_date::timestamptz + (_days || ' days')::interval);
  END IF;

  IF NEW.sla_due_at IS NOT NULL AND lower(COALESCE(NEW.status,'')) NOT IN ('settled','rejected','closed','approved')
     AND now() > NEW.sla_due_at THEN
    NEW.sla_breached := true;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_set_sla ON public.claims;
CREATE TRIGGER trg_claim_set_sla
BEFORE INSERT OR UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.claim_set_sla();
