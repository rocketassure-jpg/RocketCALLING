
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  claim_number TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('motor','health','life')),
  policy_id UUID,
  client_lead_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  insurer_id UUID REFERENCES public.insurers(id) ON DELETE SET NULL,
  claim_type TEXT,
  incident_date DATE,
  intimation_date DATE DEFAULT CURRENT_DATE,
  claim_amount NUMERIC(14,2) DEFAULT 0,
  approved_amount NUMERIC(14,2) DEFAULT 0,
  settled_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'intimated' CHECK (status IN ('intimated','documents_pending','surveyor_assigned','under_review','approved','rejected','settled','closed')),
  surveyor_name TEXT,
  surveyor_contact TEXT,
  hospital_name TEXT,
  garage_name TEXT,
  remarks TEXT,
  assigned_to UUID,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, claim_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_sel" ON public.claims FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "claims_ins" ON public.claims FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "claims_upd" ON public.claims FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "claims_del" ON public.claims FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_path TEXT,
  is_required BOOLEAN DEFAULT true,
  is_received BOOLEAN DEFAULT false,
  uploaded_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_documents TO authenticated;
GRANT ALL ON public.claim_documents TO service_role;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim_docs_all" ON public.claim_documents FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

CREATE TABLE IF NOT EXISTS public.claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  remarks TEXT,
  changed_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.claim_status_history TO authenticated;
GRANT ALL ON public.claim_status_history TO service_role;
ALTER TABLE public.claim_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim_hist_sel" ON public.claim_status_history FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "claim_hist_ins" ON public.claim_status_history FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

CREATE OR REPLACE FUNCTION public.claim_log_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.claim_status_history (company_id, claim_id, from_status, to_status, changed_by)
    VALUES (NEW.company_id, NEW.id, NULL, NEW.status, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.claim_status_history (company_id, claim_id, from_status, to_status, changed_by)
    VALUES (NEW.company_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_claim_log_status
AFTER INSERT OR UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.claim_log_status();

CREATE OR REPLACE VIEW public.unified_policies AS
SELECT id, company_id, 'motor'::text AS policy_type, policy_number,
  client_lead_id, insurer_id, agent_id,
  start_date, end_date, net_premium AS premium, idv AS sum_amount,
  status, created_at
FROM public.motor_policies
UNION ALL
SELECT id, company_id, 'health'::text, policy_number,
  client_lead_id, insurer_id, agent_id,
  start_date, end_date, net_premium, sum_insured,
  status, created_at
FROM public.health_policies
UNION ALL
SELECT id, company_id, 'life'::text, policy_number,
  client_lead_id, insurer_id, agent_id,
  commencement_date, maturity_date, net_premium, sum_assured,
  status, created_at
FROM public.life_policies;
GRANT SELECT ON public.unified_policies TO authenticated;
