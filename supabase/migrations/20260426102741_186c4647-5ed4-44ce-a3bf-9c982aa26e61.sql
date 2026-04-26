
-- Create demo users using Supabase auth schema directly
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  tc1_id uuid := gen_random_uuid();
  tc2_id uuid := gen_random_uuid();
  badnawar_id uuid;
  indore_id uuid;
  ujjain_id uuid;
  gajnod_id uuid;
BEGIN
  SELECT id INTO badnawar_id FROM public.areas WHERE name='Badnawar';
  SELECT id INTO indore_id FROM public.areas WHERE name='Indore';
  SELECT id INTO ujjain_id FROM public.areas WHERE name='Ujjain';
  SELECT id INTO gajnod_id FROM public.areas WHERE name='Gajnod';

  -- Admin user
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin@rocketinsurance.com', crypt('Admin@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rocket Admin"}', now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"%s"}', admin_id, 'admin@rocketinsurance.com')::jsonb, 'email', admin_id::text, now(), now(), now());

  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');

  -- Telecaller 1
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', tc1_id, 'authenticated', 'authenticated', 'telecaller1@rocketinsurance.com', crypt('Caller@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}', now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), tc1_id, format('{"sub":"%s","email":"%s"}', tc1_id, 'telecaller1@rocketinsurance.com')::jsonb, 'email', tc1_id::text, now(), now(), now());

  INSERT INTO public.user_roles (user_id, role) VALUES (tc1_id, 'telecaller');
  INSERT INTO public.telecaller_areas (telecaller_id, area_id) VALUES (tc1_id, badnawar_id), (tc1_id, gajnod_id);

  -- Telecaller 2
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', tc2_id, 'authenticated', 'authenticated', 'telecaller2@rocketinsurance.com', crypt('Caller@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Verma"}', now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), tc2_id, format('{"sub":"%s","email":"%s"}', tc2_id, 'telecaller2@rocketinsurance.com')::jsonb, 'email', tc2_id::text, now(), now(), now());

  INSERT INTO public.user_roles (user_id, role) VALUES (tc2_id, 'telecaller');
  INSERT INTO public.telecaller_areas (telecaller_id, area_id) VALUES (tc2_id, indore_id), (tc2_id, ujjain_id);

  -- Demo leads
  INSERT INTO public.leads (customer_name, phone_number, area_id, policy_type, status) VALUES
    ('Amit Patel', '+919876543210', badnawar_id, 'Life', 'New'),
    ('Sunita Joshi', '+919876543211', badnawar_id, 'Health', 'New'),
    ('Vikram Singh', '+919876543212', gajnod_id, 'Motor', 'Follow-up'),
    ('Meena Gupta', '+919876543213', gajnod_id, 'Life', 'New'),
    ('Rajesh Kumar', '+919876543214', indore_id, 'Health', 'New'),
    ('Anita Desai', '+919876543215', indore_id, 'Motor', 'Interested'),
    ('Sanjay Mehta', '+919876543216', indore_id, 'Life', 'New'),
    ('Pooja Agarwal', '+919876543217', ujjain_id, 'Health', 'New'),
    ('Deepak Yadav', '+919876543218', ujjain_id, 'Motor', 'Not Picked'),
    ('Kavita Rao', '+919876543219', ujjain_id, 'Life', 'New');
END $$;
