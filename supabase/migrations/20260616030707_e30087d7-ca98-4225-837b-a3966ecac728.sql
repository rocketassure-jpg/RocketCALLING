
-- Add module_key for per-module training help & update handle_new_user to honor custom company_code on create
ALTER TABLE public.training_materials ADD COLUMN IF NOT EXISTS module_key text;
CREATE INDEX IF NOT EXISTS idx_training_materials_module_key ON public.training_materials(module_key);

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
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  _req            := NEW.raw_user_meta_data->>'requested_role';
  _company_code   := NEW.raw_user_meta_data->>'company_code';
  _create_company := NEW.raw_user_meta_data->>'create_company';
  _company_name   := NEW.raw_user_meta_data->>'company_name';

  _safe_role := CASE WHEN _req IN ('telecaller','manager') THEN _req ELSE 'telecaller' END::app_role;

  -- Join mode: lookup existing
  IF _create_company IS DISTINCT FROM 'true' AND _company_code IS NOT NULL AND length(_company_code) > 0 THEN
    SELECT id INTO _company_id FROM public.companies WHERE upper(code) = upper(_company_code) AND is_active = true LIMIT 1;
  END IF;

  -- Create mode: use provided code if available & unique, else auto-generate
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
