ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS supplier_deleted_at timestamptz;

ALTER TABLE public.supplier_inquiries
  ADD COLUMN IF NOT EXISTS supplier_deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deal_interests_supplier_deleted_at
  ON public.deal_interests (supplier_deleted_at)
  WHERE supplier_deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_supplier_deleted_at
  ON public.supplier_inquiries (supplier_id, supplier_deleted_at)
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
DECLARE
  v_supplier_id uuid;
BEGIN
  IF _lead_kind = 'interest' THEN
    SELECT d.supplier_id INTO v_supplier_id
    FROM public.deal_interests di
    JOIN public.deals d ON d.id::text = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _lead_id
      AND s.user_id = auth.uid()
      AND COALESCE(di.is_deleted, false) = false;

    IF v_supplier_id IS NULL THEN
      RAISE EXCEPTION 'Lead not found or not allowed';
    END IF;

    UPDATE public.deal_interests
    SET supplier_deleted_at = CASE WHEN _trashed THEN now() ELSE NULL END
    WHERE id = _lead_id;
    RETURN;
  END IF;

  IF _lead_kind = 'inquiry' THEN
    SELECT si.supplier_id INTO v_supplier_id
    FROM public.supplier_inquiries si
    JOIN public.suppliers s ON s.id = si.supplier_id
    WHERE si.id = _lead_id
      AND s.user_id = auth.uid()
      AND COALESCE(si.is_deleted, false) = false;

    IF v_supplier_id IS NULL THEN
      RAISE EXCEPTION 'Lead not found or not allowed';
    END IF;

    UPDATE public.supplier_inquiries
    SET supplier_deleted_at = CASE WHEN _trashed THEN now() ELSE NULL END
    WHERE id = _lead_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Unsupported lead kind';
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_supplier_leads(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = _supplier_id
      AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.deal_interests di
  SET is_deleted = true,
      deleted_at = COALESCE(di.deleted_at, now())
  FROM public.deals d
  WHERE d.id::text = di.deal_id
    AND d.supplier_id = _supplier_id
    AND COALESCE(di.is_deleted, false) = false
    AND di.supplier_deleted_at < now() - interval '7 days';

  DELETE FROM public.supplier_inquiries si
  WHERE si.supplier_id = _supplier_id
    AND si.supplier_deleted_at < now() - interval '7 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_set_lead_trashed(text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_supplier_leads(uuid) TO authenticated;
