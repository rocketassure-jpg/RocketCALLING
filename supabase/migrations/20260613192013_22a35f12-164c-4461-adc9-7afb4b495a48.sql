
-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_to TEXT,
  payment_mode TEXT,
  reference_no TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_company_all" ON public.expenses FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PREMIUM REMITTANCE
CREATE TABLE public.premium_remittance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  policy_number TEXT,
  policy_type TEXT,
  customer_name TEXT,
  expected_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  remitted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  remittance_date DATE,
  utr_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  discrepancy BOOLEAN GENERATED ALWAYS AS (remitted_amount <> expected_amount) STORED,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_remittance TO authenticated;
GRANT ALL ON public.premium_remittance TO service_role;
ALTER TABLE public.premium_remittance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "remit_company_all" ON public.premium_remittance FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_remit_updated BEFORE UPDATE ON public.premium_remittance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPLAINTS
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaints_company_all" ON public.complaints FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SERVICE REQUESTS
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  tat_hours NUMERIC(8,2),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_company_all" ON public.service_requests FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPLIANCE TRACKER
CREATE TABLE public.compliance_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  agent_id UUID,
  agent_name TEXT NOT NULL,
  license_no TEXT,
  license_type TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_tracker TO authenticated;
GRANT ALL ON public.compliance_tracker TO service_role;
ALTER TABLE public.compliance_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_company_all" ON public.compliance_tracker FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_comp_updated BEFORE UPDATE ON public.compliance_tracker FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_company_select" ON public.audit_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "audit_insert_self" ON public.audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  related_type TEXT,
  related_id UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_company_all" ON public.tasks FOR ALL
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
