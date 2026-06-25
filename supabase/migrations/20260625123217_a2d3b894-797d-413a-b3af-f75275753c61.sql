
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _role TEXT,
  _full_name TEXT,
  _city TEXT,
  _business_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  role_val app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _role NOT IN ('resident', 'supplier') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  role_val := _role::app_role;

  UPDATE public.profiles
     SET full_name = COALESCE(NULLIF(_full_name, ''), full_name),
         user_type = _role,
         city = CASE WHEN _role = 'resident' THEN NULLIF(_city, '') ELSE city END,
         business_name = CASE WHEN _role = 'supplier' THEN NULLIF(_business_name, '') ELSE business_name END,
         onboarding_completed = true,
         updated_at = now()
   WHERE id = uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, role_val)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT, TEXT, TEXT) TO authenticated;
