UPDATE public.deal_interests
SET supplier_deleted_at = NULL
WHERE supplier_deleted_at IS NOT NULL;

UPDATE public.supplier_inquiries
SET supplier_deleted_at = NULL
WHERE supplier_deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.supplier_set_lead_trashed(
  _lead_kind text,
  _lead_id uuid,
  _trashed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Lead trash is temporarily disabled';
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_supplier_leads(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;
