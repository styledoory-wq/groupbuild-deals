
-- 1) Fix approve_lead_and_deposit to handle deals without deposit requirement
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
  v_pending_deposit public.deposits%ROWTYPE;
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
      AND (
        s.user_id = auth.uid()
        OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
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

  -- If the deal doesn't require a deposit, just approve the lead.
  IF NOT COALESCE(v_deal.deposit_required, false) OR COALESCE(v_deal.deposit_amount, 0) <= 0 THEN
    UPDATE public.deal_interests
    SET lead_status = 'approved',
        status = 'approved',
        updated_at = now()
    WHERE id = v_interest.id;
    RETURN;
  END IF;

  -- Deposit-required path
  SELECT * INTO v_pending_deposit
  FROM public.deposits
  WHERE user_id = v_interest.user_id
    AND deal_id = v_interest.deal_id
    AND COALESCE(is_deleted, false) = false
    AND status = 'pending'::deposit_status
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pending_deposit.id IS NOT NULL THEN
    PERFORM set_config('app.allow_supplier_deposit_approval', 'on', true);
    UPDATE public.deposits
    SET status = 'paid'::deposit_status,
        paid_at = COALESCE(paid_at, now())
    WHERE id = v_pending_deposit.id;

    UPDATE public.deal_interests
    SET lead_status = 'approved',
        status = 'paid',
        deposit_status = 'paid',
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

  -- No deposit yet: still approve the lead, deposit stays pending until paid
  UPDATE public.deal_interests
  SET lead_status = 'approved',
      status = 'approved',
      updated_at = now()
  WHERE id = v_interest.id;
END;
$function$;

-- 2) Close deals whose join deadline has passed
CREATE OR REPLACE FUNCTION public.close_expired_deals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
BEGIN
  WITH upd AS (
    UPDATE public.deals
       SET status = 'closed',
           auto_closed_at = now(),
           updated_at = now()
     WHERE status = 'active'
       AND COALESCE(is_deleted, false) = false
       AND auto_closed_at IS NULL
       AND (
            (join_deadline IS NOT NULL AND join_deadline < now())
         OR (ends_at IS NOT NULL AND ends_at < now())
       )
     RETURNING id::text AS id
  )
  SELECT count(*) INTO v_count FROM upd;

  -- Issue vouchers for any newly closed deals
  PERFORM public.issue_vouchers_for_deal(d.id::text)
  FROM public.deals d
  WHERE d.auto_closed_at IS NOT NULL
    AND d.status = 'closed'
    AND d.auto_closed_at > now() - interval '15 minutes';

  RETURN v_count;
END;
$$;

-- 3) Schedule it every 10 minutes via pg_cron (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('close-expired-deals');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'close-expired-deals',
  '*/10 * * * *',
  $$ SELECT public.close_expired_deals(); $$
);
