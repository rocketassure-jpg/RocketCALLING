-- 1) Block role escalation in new-user trigger -------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _is_first BOOLEAN;
  _req TEXT;
  _safe_role app_role;
  _company_code TEXT;
  _create_company TEXT;
  _company_name TEXT;
  _company_id UUID;
  _new_code TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  _req            := NEW.raw_user_meta_data->>'requested_role';
  _company_code   := NEW.raw_user_meta_data->>'company_code';
  _create_company := NEW.raw_user_meta_data->>'create_company';
  _company_name   := NEW.raw_user_meta_data->>'company_name';

  -- Whitelist: only telecaller/manager may be self-requested. Never admin.
  _safe_role := CASE WHEN _req IN ('telecaller','manager') THEN _req ELSE 'telecaller' END::app_role;

  IF _company_code IS NOT NULL AND length(_company_code) > 0 THEN
    SELECT id INTO _company_id FROM public.companies WHERE upper(code) = upper(_company_code) AND is_active = true LIMIT 1;
  END IF;

  IF _company_id IS NULL AND _create_company = 'true' AND _company_name IS NOT NULL THEN
    _new_code := upper(regexp_replace(_company_name,'[^a-zA-Z0-9]','','g'));
    IF length(_new_code) < 3 THEN _new_code := _new_code || substr(md5(NEW.id::text),1,6); END IF;
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE code = _new_code) LOOP
      _new_code := _new_code || substr(md5(random()::text),1,2);
    END LOOP;
    INSERT INTO public.companies (name, code, created_by) VALUES (_company_name, _new_code, NEW.id) RETURNING id INTO _company_id;
    INSERT INTO public.company_subscriptions (company_id, module_key, billing_cycle, status, end_date)
    SELECT _company_id, module_key,
      CASE WHEN is_always_included THEN 'lifetime' ELSE 'trial' END,
      'active',
      CASE WHEN is_always_included THEN NULL ELSE CURRENT_DATE + INTERVAL '14 days' END
    FROM public.modules;
  END IF;

  IF _company_id IS NULL THEN
    SELECT id INTO _company_id FROM public.companies WHERE code = 'ROCKET' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, department, requested_role, is_approved, is_active, company_id, is_super_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'department',
    _safe_role::text,
    true,
    true,
    _company_id,
    _is_first
  );

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSIF _create_company = 'true' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _safe_role) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Stop profile self-update privilege escalation --------------------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass
      AND (lower(polname) LIKE '%update own%' OR lower(polname) LIKE '%users update%own%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.polname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is editing their own row and is not admin/super admin, block sensitive fields
  IF auth.uid() = NEW.id
     AND NOT COALESCE(public.is_super_admin(auth.uid()), false)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
       OR NEW.is_active     IS DISTINCT FROM OLD.is_active
       OR NEW.is_approved   IS DISTINCT FROM OLD.is_approved
       OR NEW.company_id    IS DISTINCT FROM OLD.company_id
       OR NEW.manager_id    IS DISTINCT FROM OLD.manager_id
       OR NEW.requested_role IS DISTINCT FROM OLD.requested_role
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_escalation();

-- Re-create a safe self-update policy
CREATE POLICY "Users update own profile safe"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3) Hide invite_code from regular users ------------------------------
REVOKE SELECT (invite_code) ON public.app_settings FROM authenticated;
REVOKE SELECT (invite_code) ON public.app_settings FROM anon;

CREATE OR REPLACE FUNCTION public.get_invite_code()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT invite_code FROM public.app_settings
  WHERE public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.invite_code_required()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE invite_code IS NOT NULL AND length(invite_code) > 0
  )
$$;

REVOKE EXECUTE ON FUNCTION public.get_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_code_required() TO anon, authenticated;

-- 4) Tighten internal SECURITY DEFINER helpers ------------------------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.manager_can_see_lead(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.telecaller_has_area(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_module(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_modules(uuid) FROM anon;
-- lookup_company_by_code and validate_invite_code stay accessible to anon (used pre-auth at signup)
