CREATE OR REPLACE FUNCTION public.get_voucher_resident_profiles(_user_ids uuid[])
RETURNS TABLE (id uuid, full_name text, project_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.project_id
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
    AND EXISTS (
      SELECT 1 FROM public.vouchers v
      JOIN public.suppliers s ON s.id = v.supplier_id
      WHERE v.user_id = p.id
        AND s.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_voucher_resident_profiles(uuid[]) TO authenticated;