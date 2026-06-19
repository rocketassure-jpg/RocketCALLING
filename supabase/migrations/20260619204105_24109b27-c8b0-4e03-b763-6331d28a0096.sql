
-- 1) export_history: add company_id, backfill, scope policies
ALTER TABLE public.export_history ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE public.export_history eh
SET company_id = p.company_id
FROM public.profiles p
WHERE eh.generated_by = p.id AND eh.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_export_history_company_id ON public.export_history(company_id);

DROP POLICY IF EXISTS "Super admins read export history" ON public.export_history;
DROP POLICY IF EXISTS "Super admins insert export history" ON public.export_history;

CREATE POLICY "Read export history scoped to company"
ON public.export_history FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND company_id IS NOT NULL
    AND company_id = public.user_company_id()
  )
  OR generated_by = auth.uid()
);

CREATE POLICY "Insert export history scoped to company"
ON public.export_history FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (company_id IS NULL OR company_id = public.user_company_id())
    AND (generated_by IS NULL OR generated_by = auth.uid())
  )
);

-- Auto-fill company_id and generated_by from current session
CREATE OR REPLACE FUNCTION public.export_history_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.generated_by IS NULL THEN NEW.generated_by := auth.uid(); END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id := public.user_company_id(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_export_history_defaults ON public.export_history;
CREATE TRIGGER trg_export_history_defaults
BEFORE INSERT ON public.export_history
FOR EACH ROW EXECUTE FUNCTION public.export_history_set_defaults();

-- 2) Announcements: enforce target_roles filter
DROP POLICY IF EXISTS "ann_read_targeted" ON public.announcements;

CREATE POLICY "ann_read_targeted"
ON public.announcements FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    show_from <= now()
    AND (show_until IS NULL OR show_until >= now())
    AND (target = 'all' OR (target = 'specific_companies' AND public.user_company_id() = ANY (target_company_ids)))
    AND (
      target_roles IS NULL
      OR array_length(target_roles, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role::text = ANY (target_roles)
      )
    )
  )
);

-- 3) user_roles: only allow inserting non-privileged roles (defense in depth)
DROP POLICY IF EXISTS "Admins insert company roles" ON public.user_roles;

CREATE POLICY "Admins insert company roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND role IN ('telecaller'::app_role, 'manager'::app_role, 'sub_agent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.company_id = public.user_company_id()
    )
  )
);
