
-- Restore deleted profiles from auth.users metadata, and recreate the missing supplier record.
-- Safe: uses ON CONFLICT DO NOTHING so existing rows are untouched.

-- 1. Restore profiles for all auth users that lost them
INSERT INTO public.profiles (id, email, full_name, phone, city, user_type, business_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', u.phone),
  COALESCE(u.raw_user_meta_data->>'city', ''),
  COALESCE(u.raw_user_meta_data->>'user_type', 'resident'),
  NULLIF(u.raw_user_meta_data->>'business_name', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2. Restore user_roles based on metadata (default resident)
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  COALESCE((u.raw_user_meta_data->>'user_type')::public.app_role, 'resident'::public.app_role)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;

-- 3. Remove the stray 'resident' role from the admin user (he should only be admin)
DELETE FROM public.user_roles
WHERE user_id = 'e328c0b8-2346-4f08-93ca-168b7bc51017'
  AND role = 'resident';

-- 4. Make sure the admin profile is marked admin
UPDATE public.profiles
SET user_type = 'admin'
WHERE email = 'styledoor.y@gmail.com';

-- 5. Recreate the missing supplier record for styledoor.o@gmail.com (דוד / מטבחי)
INSERT INTO public.suppliers (
  user_id, business_name, email, contact_name,
  approval_status, is_active, categories, service_areas, serves_all_country
)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'business_name', ''), 'מטבחי'),
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'pending',
  true,
  '{}'::text[],
  '{}'::text[],
  false
FROM auth.users u
WHERE u.email = 'styledoor.o@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.user_id = u.id);

-- 6. Make sure supplier user_type/role are aligned for the supplier user
UPDATE public.profiles
SET user_type = 'supplier'
WHERE email = 'styledoor.o@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'supplier'::public.app_role FROM auth.users WHERE email = 'styledoor.o@gmail.com'
ON CONFLICT DO NOTHING;

DELETE FROM public.user_roles r
USING auth.users u
WHERE r.user_id = u.id
  AND u.email = 'styledoor.o@gmail.com'
  AND r.role = 'resident';
