
-- Add approval/department fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS requested_role text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Add invite_code to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Seed an invite code if missing (single-row settings)
UPDATE public.app_settings SET invite_code = COALESCE(invite_code, 'ROCKET2026') WHERE invite_code IS NULL;
INSERT INTO public.app_settings (invite_code)
SELECT 'ROCKET2026' WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Security definer to validate invite code from signup (anon callable)
CREATE OR REPLACE FUNCTION public.validate_invite_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_settings WHERE invite_code = _code AND _code IS NOT NULL AND length(_code) > 0)
$$;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon, authenticated;

-- Helper: is_approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_approved AND is_active FROM public.profiles WHERE id = _user_id), false)
$$;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;

-- Update handle_new_user to capture department + requested_role and auto-approve first admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;

  INSERT INTO public.profiles (id, full_name, department, requested_role, is_approved, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'requested_role',
    _is_first,
    true
  );

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow admins to update profiles (approve / reject / deactivate)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert user_roles (when approving)
DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
CREATE POLICY "Admins can insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
CREATE POLICY "Admins can delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
