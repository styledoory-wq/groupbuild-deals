
CREATE OR REPLACE FUNCTION public.supplier_soft_delete_interest(_interest_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deal_interests di
    JOIN public.deals d ON d.id::text = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _interest_id AND s.user_id = auth.uid()
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.deal_interests
     SET is_deleted = true, deleted_at = now(), updated_at = now()
   WHERE id = _interest_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_restore_interest(_interest_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deal_interests di
    JOIN public.deals d ON d.id::text = di.deal_id
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE di.id = _interest_id AND s.user_id = auth.uid()
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.deal_interests
     SET is_deleted = false, deleted_at = NULL, updated_at = now()
   WHERE id = _interest_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_soft_delete_inquiry(_inquiry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_inquiries q
    JOIN public.suppliers s ON s.id = q.supplier_id
    WHERE q.id = _inquiry_id AND s.user_id = auth.uid()
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.supplier_inquiries
     SET is_deleted = true, deleted_at = now(), updated_at = now()
   WHERE id = _inquiry_id;
END; $$;

CREATE OR REPLACE FUNCTION public.supplier_restore_inquiry(_inquiry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_inquiries q
    JOIN public.suppliers s ON s.id = q.supplier_id
    WHERE q.id = _inquiry_id AND s.user_id = auth.uid()
  ) INTO v_ok;
  IF NOT v_ok AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.supplier_inquiries
     SET is_deleted = false, deleted_at = NULL, updated_at = now()
   WHERE id = _inquiry_id;
END; $$;

DROP POLICY IF EXISTS deposits_insert_own ON public.deposits;
CREATE POLICY deposits_insert_own ON public.deposits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Authenticated insert audit" ON public.deposit_audit_log;
CREATE POLICY "Authenticated insert audit" ON public.deposit_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    ((user_id IS NULL) OR (user_id = auth.uid()))
    AND (
      public.has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.deposits d
        WHERE d.id = deposit_audit_log.deposit_id
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.reviews;
CREATE POLICY "Users can view relevant reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id::text = reviews.deal_id AND s.user_id = auth.uid()
    )
  );

DROP FUNCTION IF EXISTS public.get_supplier_rating(uuid);
CREATE FUNCTION public.get_supplier_rating(_supplier_id uuid)
RETURNS TABLE (avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(AVG(r.rating)::numeric, 0), COUNT(*)::bigint
  FROM public.reviews r
  JOIN public.deals d ON d.id::text = r.deal_id
  WHERE d.supplier_id = _supplier_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_supplier_rating(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_deal_reviews_public(text);
CREATE FUNCTION public.get_deal_reviews_public(_deal_id text)
RETURNS TABLE (id uuid, rating int, comment text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.rating, r.comment, r.created_at
  FROM public.reviews r WHERE r.deal_id = _deal_id
  ORDER BY r.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_deal_reviews_public(text) TO anon, authenticated;

REVOKE SELECT (commission_percent, monthly_subscription, billing_status, billing_notes)
  ON public.suppliers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_supplier_billing(_supplier_id uuid)
RETURNS TABLE (
  commission_percent numeric,
  monthly_subscription numeric,
  billing_status text,
  billing_notes text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT s.commission_percent, s.monthly_subscription, s.billing_status, s.billing_notes
    FROM public.suppliers s WHERE s.id = _supplier_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_get_supplier_billing(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_supplier_billing()
RETURNS TABLE (
  id uuid,
  commission_percent numeric,
  monthly_subscription numeric,
  billing_status text,
  billing_notes text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT s.id, s.commission_percent, s.monthly_subscription, s.billing_status, s.billing_notes
    FROM public.suppliers s;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_supplier_billing() TO authenticated;
