ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles SET is_super_admin = false WHERE id <> '2b0ae883-c233-4d39-bdcf-bcf8bc027107';
UPDATE public.profiles SET is_super_admin = true, is_active = true, is_approved = true WHERE id = '2b0ae883-c233-4d39-bdcf-bcf8bc027107';
ALTER TABLE public.profiles ENABLE TRIGGER USER;
INSERT INTO public.user_roles (user_id, role) VALUES ('2b0ae883-c233-4d39-bdcf-bcf8bc027107', 'admin') ON CONFLICT DO NOTHING;