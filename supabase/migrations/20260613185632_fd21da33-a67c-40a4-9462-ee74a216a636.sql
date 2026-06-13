
-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id UUID,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  alt_mobile TEXT,
  email TEXT,
  dob DATE,
  gender TEXT,
  occupation TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  pan TEXT,
  aadhaar_last4 TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending', -- pending|verified|rejected
  family_head_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  relation_to_head TEXT, -- self|spouse|son|daughter|father|mother|other
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  source_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_company ON public.customers(company_id);
CREATE INDEX idx_customers_agent ON public.customers(agent_id);
CREATE INDEX idx_customers_mobile ON public.customers(mobile);
CREATE INDEX idx_customers_family ON public.customers(family_head_id);
CREATE UNIQUE INDEX uq_customers_company_mobile ON public.customers(company_id, mobile);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_company"
ON public.customers FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.user_company_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR agent_id = auth.uid()
      OR created_by = auth.uid()
    )
  )
);

CREATE POLICY "customers_insert_company"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.user_company_id()
  AND (created_by = auth.uid() OR created_by IS NULL)
);

CREATE POLICY "customers_update_company"
ON public.customers FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    company_id = public.user_company_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR agent_id = auth.uid()
    )
  )
);

CREATE POLICY "customers_delete_admin"
ON public.customers FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id() AND public.has_role(auth.uid(), 'admin'))
);

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CUSTOMER DOCUMENTS ============
CREATE TABLE public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- aadhaar|pan|photo|address_proof|other
  label TEXT,
  storage_path TEXT NOT NULL, -- path in bucket customer-docs
  mime_type TEXT,
  size_bytes INT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cust_docs_customer ON public.customer_documents(customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cust_docs_select_company"
ON public.customer_documents FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR company_id = public.user_company_id()
);

CREATE POLICY "cust_docs_insert_company"
ON public.customer_documents FOR INSERT TO authenticated
WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "cust_docs_delete_company"
ON public.customer_documents FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.user_company_id()
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR uploaded_by = auth.uid()))
);

-- ============ LEAD → CUSTOMER LINK ============
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_customer ON public.leads(customer_id);
