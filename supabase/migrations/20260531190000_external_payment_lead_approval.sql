-- With external payment providers, supplier lead approval must not mark money as paid.
-- Paid status should come from a verified payment webhook or an admin-only manual action.
CREATE OR REPLACE FUNCTION public.approve_lead_and_deposit(_interest_id uuid, _lead_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_is_admin boolean;
  v_is_supplier boolean;
  v_paid_deposit public.deposits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _lead_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid lead status';
  END IF;

  SELECT * INTO v_interest
  FROM public.deal_interests
  WHERE id = _interest_id
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_interest.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  SELECT * INTO v_deal FROM public.deals WHERE id::text = v_interest.deal_id LIMIT 1;

  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id::text = v_interest.deal_id
      AND s.user_id = auth.uid()
  ) INTO v_is_supplier;

  IF NOT v_is_admin AND NOT v_is_supplier THEN
    RAISE EXCEPTION 'Not allowed to approve this lead';
  END IF;

  IF _lead_status = 'rejected' THEN
    UPDATE public.deal_interests
    SET lead_status = 'rejected',
        status = 'rejected',
        updated_at = now()
    WHERE id = v_interest.id;
    RETURN;
  END IF;

  IF NOT COALESCE(v_deal.deposit_required, false) OR COALESCE(v_deal.deposit_amount, 0) <= 0 THEN
    UPDATE public.deal_interests
    SET lead_status = 'approved',
        status = 'approved',
        updated_at = now()
    WHERE id = v_interest.id;
    RETURN;
  END IF;

  SELECT * INTO v_paid_deposit
  FROM public.deposits
  WHERE user_id = v_interest.user_id
    AND deal_id = v_interest.deal_id
    AND COALESCE(is_deleted, false) = false
    AND status = 'paid'::deposit_status
  ORDER BY paid_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_paid_deposit.id IS NOT NULL THEN
    UPDATE public.deal_interests
    SET lead_status = 'approved',
        status = 'paid',
        deposit_status = 'paid',
        updated_at = now()
    WHERE id = v_interest.id;
    RETURN;
  END IF;

  UPDATE public.deal_interests
  SET lead_status = 'approved',
      status = 'pending_deposit',
      deposit_status = 'pending',
      updated_at = now()
  WHERE id = v_interest.id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) TO authenticated;
