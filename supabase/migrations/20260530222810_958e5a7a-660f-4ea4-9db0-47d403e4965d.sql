CREATE OR REPLACE FUNCTION public.claim_supplier_profile_by_email()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_supplier_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF v_email = '' THEN
    RAISE EXCEPTION 'missing_authenticated_email';
  END IF;

  UPDATE public.suppliers s
  SET user_id = auth.uid(),
      email = COALESCE(NULLIF(s.email, ''), auth.jwt() ->> 'email'),
      updated_at = now()
  WHERE s.user_id IS NULL
    AND COALESCE(s.is_deleted, false) = false
    AND lower(COALESCE(s.email, '')) = v_email
  RETURNING s.id INTO v_supplier_id;

  RETURN v_supplier_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_supplier_profile_by_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_supplier_profile_by_email() TO authenticated, service_role;