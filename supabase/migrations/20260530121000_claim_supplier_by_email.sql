CREATE OR REPLACE FUNCTION public.claim_supplier_profile_by_email(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing authenticated email';
  END IF;

  UPDATE public.suppliers
  SET user_id = auth.uid(),
      email = COALESCE(email, auth.jwt() ->> 'email')
  WHERE id = _supplier_id
    AND COALESCE(is_deleted, false) = false
    AND (user_id IS NULL OR user_id = auth.uid())
    AND lower(COALESCE(email, '')) = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier profile cannot be linked to this user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_supplier_profile_by_email(uuid) TO authenticated;
