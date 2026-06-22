
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS supplier_notes text;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS supplier_starred boolean NOT NULL DEFAULT false;
ALTER TABLE public.supplier_inquiries ADD COLUMN IF NOT EXISTS supplier_notes text;
ALTER TABLE public.supplier_inquiries ADD COLUMN IF NOT EXISTS supplier_starred boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.supplier_update_interest_meta(
  _interest_id uuid,
  _notes text DEFAULT NULL,
  _starred boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deal_interests di
    JOIN public.deals d ON d.id = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _interest_id
      AND (s.user_id = v_uid OR lower(coalesce(s.email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(v_uid,'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.deal_interests
     SET supplier_notes   = COALESCE(_notes,   supplier_notes),
         supplier_starred = COALESCE(_starred, supplier_starred),
         updated_at = now()
   WHERE id = _interest_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_update_interest_meta(uuid, text, boolean) TO authenticated;
