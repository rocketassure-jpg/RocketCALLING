
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles(mobile);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  _mobile TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  _req            := NEW.raw_user_meta_data->>'requested_role';
  _company_code   := NEW.raw_user_meta_data->>'company_code';
  _create_company := NEW.raw_user_meta_data->>'create_company';
  _company_name   := NEW.raw_user_meta_data->>'company_name';
  _mobile         := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'mobile',''), '\D', '', 'g');
  IF _mobile = '' THEN _mobile := NULL; END IF;

  _safe_role := CASE WHEN _req IN ('telecaller','manager') THEN _req ELSE 'telecaller' END::app_role;

  IF _create_company IS DISTINCT FROM 'true' AND _company_code IS NOT NULL AND length(_company_code) > 0 THEN
    SELECT id INTO _company_id FROM public.companies WHERE upper(code) = upper(_company_code) AND is_active = true LIMIT 1;
  END IF;

  IF _company_id IS NULL AND _create_company = 'true' AND _company_name IS NOT NULL THEN
    IF _company_code IS NOT NULL AND length(_company_code) >= 3 THEN
      _new_code := upper(regexp_replace(_company_code,'[^A-Za-z0-9]','','g'));
    ELSE
      _new_code := upper(regexp_replace(_company_name,'[^a-zA-Z0-9]','','g'));
    END IF;
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

  INSERT INTO public.profiles (id, full_name, department, requested_role, is_approved, is_active, company_id, is_super_admin, mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'department',
    _safe_role::text,
    true,
    true,
    _company_id,
    _is_first,
    _mobile
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

-- Public RPC: resolve a login (email or mobile) to the actual email for supabase auth
CREATE OR REPLACE FUNCTION public.resolve_login_email(_login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _digits text;
  _email text;
  _uid uuid;
BEGIN
  IF _login IS NULL OR length(trim(_login)) = 0 THEN RETURN NULL; END IF;
  IF position('@' in _login) > 0 THEN RETURN _login; END IF;
  _digits := regexp_replace(_login, '\D', '', 'g');
  IF length(_digits) < 6 THEN RETURN NULL; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE mobile = _digits LIMIT 1;
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid LIMIT 1;
  RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- Expose company name to logged-in user for header display
CREATE OR REPLACE FUNCTION public.my_company_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name FROM public.companies c
  JOIN public.profiles p ON p.company_id = c.id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.my_company_name() TO authenticated;
