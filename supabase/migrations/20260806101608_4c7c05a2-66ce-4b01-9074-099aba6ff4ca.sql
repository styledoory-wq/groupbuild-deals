CREATE OR REPLACE FUNCTION public.admin_approve_supplier(_supplier_id uuid, _approve boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT true INTO _exists FROM public.suppliers WHERE id = _supplier_id;
  IF _exists IS NOT TRUE THEN
    RAISE EXCEPTION 'supplier_not_found';
  END IF;

  UPDATE public.suppliers
     SET approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         is_active = CASE WHEN _approve THEN true ELSE false END,
         updated_at = now()
   WHERE id = _supplier_id;

  RETURN jsonb_build_object('ok', true, 'approved', _approve);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_supplier(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_supplier(uuid, boolean) TO authenticated;