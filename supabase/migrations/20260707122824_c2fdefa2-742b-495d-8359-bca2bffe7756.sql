
-- 1) Suppliers: revoke anonymous SELECT on sensitive banking/payment columns.
--    Signed-in users (including the supplier owner and admins) still see them
--    subject to existing RLS policies.
REVOKE SELECT (
  bank_account_number,
  bank_branch,
  bank_name,
  bank_account_holder,
  bit_phone,
  payment_instructions_note
) ON public.suppliers FROM anon;

-- 2) system_settings: require authentication to read internal business config.
DROP POLICY IF EXISTS "public_read_system_settings" ON public.system_settings;
CREATE POLICY "Authenticated can read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Avatars storage bucket: restrict public read to the owner's own folder.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Users can view their own avatar"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4) Harden SECURITY DEFINER helper — pin search_path to avoid shadowing.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
