-- Soft-delete / restore / purge for supplier leads (deal_interests + supplier_inquiries)

CREATE OR REPLACE FUNCTION public.supplier_soft_delete_interest(_interest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deal_interests di
    JOIN public.deals d ON d.id::text = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _interest_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email,'')) = lower(COALESCE(auth.jwt() ->> 'email','')))
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.deal_interests
     SET is_deleted = true, deleted_at = now(), updated_at = now()
   WHERE id = _interest_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_restore_interest(_interest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deal_interests di
    JOIN public.deals d ON d.id::text = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _interest_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email,'')) = lower(COALESCE(auth.jwt() ->> 'email','')))
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.deal_interests
     SET is_deleted = false, deleted_at = NULL, updated_at = now()
   WHERE id = _interest_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_soft_delete_inquiry(_inquiry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_inquiries q
    JOIN public.suppliers s ON s.id = q.supplier_id
    WHERE q.id = _inquiry_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email,'')) = lower(COALESCE(auth.jwt() ->> 'email','')))
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.supplier_inquiries
     SET is_deleted = true, deleted_at = now(), updated_at = now()
   WHERE id = _inquiry_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_restore_inquiry(_inquiry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_inquiries q
    JOIN public.suppliers s ON s.id = q.supplier_id
    WHERE q.id = _inquiry_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email,'')) = lower(COALESCE(auth.jwt() ->> 'email','')))
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.supplier_inquiries
     SET is_deleted = false, deleted_at = NULL, updated_at = now()
   WHERE id = _inquiry_id;
END; $$;

-- Purge: permanently delete leads that have been in trash for more than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_trashed_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_int int;
  v_inq int;
BEGIN
  WITH del AS (
    DELETE FROM public.deal_interests
     WHERE is_deleted = true
       AND deleted_at IS NOT NULL
       AND deleted_at < now() - interval '30 days'
    RETURNING 1
  ) SELECT count(*) INTO v_int FROM del;

  WITH del AS (
    DELETE FROM public.supplier_inquiries
     WHERE is_deleted = true
       AND deleted_at IS NOT NULL
       AND deleted_at < now() - interval '30 days'
    RETURNING 1
  ) SELECT count(*) INTO v_inq FROM del;

  RETURN jsonb_build_object('interests_purged', v_int, 'inquiries_purged', v_inq);
END; $$;

-- Schedule daily purge at 03:15 UTC
SELECT cron.unschedule('purge-old-trashed-leads') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'purge-old-trashed-leads'
);
SELECT cron.schedule(
  'purge-old-trashed-leads',
  '15 3 * * *',
  $$ SELECT public.purge_old_trashed_leads(); $$
);