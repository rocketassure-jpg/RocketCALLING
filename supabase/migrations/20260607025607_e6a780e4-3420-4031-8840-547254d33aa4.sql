
-- Approve all existing users
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;

-- Default new profiles to approved
ALTER TABLE public.profiles ALTER COLUMN is_approved SET DEFAULT true;

-- Update trigger so new signups auto-approve and get telecaller role if no role yet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_first boolean;
  _req text;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  _req := NEW.raw_user_meta_data->>'requested_role';

  INSERT INTO public.profiles (id, full_name, department, requested_role, is_approved, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'department',
    _req,
    true,
    true
  );

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NULLIF(_req, ''), 'telecaller')::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
