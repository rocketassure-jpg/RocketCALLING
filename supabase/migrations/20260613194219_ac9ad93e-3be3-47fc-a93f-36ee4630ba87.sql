
-- Enable scheduler & HTTP extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic audit trigger: writes old/new row snapshots to public.audit_logs
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
  _rid text;
BEGIN
  _cid := COALESCE(
    (CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END) ->> 'company_id',
    NULL
  )::uuid;
  _rid := COALESCE(
    (CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END) ->> 'id',
    NULL
  );

  INSERT INTO public.audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    _cid,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    _rid,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit trigger to sensitive tables
DROP TRIGGER IF EXISTS trg_audit_policy_transactions ON public.policy_transactions;
CREATE TRIGGER trg_audit_policy_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_broker_payouts ON public.broker_payouts;
CREATE TRIGGER trg_audit_broker_payouts
  AFTER INSERT OR UPDATE OR DELETE ON public.broker_payouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_agent_payouts ON public.agent_payouts;
CREATE TRIGGER trg_audit_agent_payouts
  AFTER INSERT OR UPDATE OR DELETE ON public.agent_payouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_claims ON public.claims;
CREATE TRIGGER trg_audit_claims
  AFTER INSERT OR UPDATE OR DELETE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_premium_remittance ON public.premium_remittance;
CREATE TRIGGER trg_audit_premium_remittance
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_remittance
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_commission_rates ON public.commission_rates;
CREATE TRIGGER trg_audit_commission_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
