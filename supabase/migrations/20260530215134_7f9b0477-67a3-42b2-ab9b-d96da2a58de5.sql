
-- Count joined participants: paid deposits + approved interests on deposit-free deals
CREATE OR REPLACE FUNCTION public.get_deal_paid_count(_deal_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT u)::int FROM (
    SELECT user_id AS u FROM public.deposits
      WHERE deal_id = _deal_id
        AND status = 'paid'
        AND COALESCE(is_deleted, false) = false
    UNION
    SELECT di.user_id AS u FROM public.deal_interests di
      JOIN public.deals d ON d.id::text = di.deal_id
      WHERE di.deal_id = _deal_id
        AND COALESCE(di.is_deleted, false) = false
        AND di.lead_status = 'approved'
        AND (COALESCE(d.deposit_required, false) = false OR COALESCE(d.deposit_amount, 0) <= 0)
  ) x
$function$;

-- Issue vouchers: include approved interests on deposit-free deals
CREATE OR REPLACE FUNCTION public.issue_vouchers_for_deal(_deal_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_count int := 0;
  v_row RECORD;
  v_code text;
  v_ref text;
BEGIN
  SELECT id, supplier_id, redemption_deadline, deposit_required, deposit_amount
    INTO v_deal
  FROM public.deals WHERE id::text = _deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN 0; END IF;

  FOR v_row IN
    SELECT DISTINCT u AS user_id FROM (
      SELECT user_id AS u FROM public.deposits
        WHERE deal_id = _deal_id AND status = 'paid'::deposit_status
          AND COALESCE(is_deleted,false) = false
      UNION
      SELECT user_id AS u FROM public.deal_interests
        WHERE deal_id = _deal_id
          AND COALESCE(is_deleted,false) = false
          AND lead_status = 'approved'
          AND (COALESCE(v_deal.deposit_required, false) = false OR COALESCE(v_deal.deposit_amount, 0) <= 0)
    ) x
  LOOP
    IF EXISTS (SELECT 1 FROM public.vouchers WHERE deal_id = _deal_id AND user_id = v_row.user_id) THEN
      CONTINUE;
    END IF;
    v_code := upper(substring(encode(extensions.gen_random_bytes(6),'hex') for 8));
    v_ref  := 'GB-' || to_char(now(),'YYMMDD') || '-' || upper(substring(encode(extensions.gen_random_bytes(4),'hex') for 6));
    INSERT INTO public.vouchers (deal_id, user_id, supplier_id, code, reference_number, expires_at, status)
    VALUES (_deal_id, v_row.user_id, v_deal.supplier_id, v_code, v_ref,
            COALESCE(v_deal.redemption_deadline, now() + interval '90 days'), 'eligible');
    INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
    SELECT id, NULL, 'issued', jsonb_build_object('deal_id', _deal_id)
    FROM public.vouchers WHERE deal_id = _deal_id AND user_id = v_row.user_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- Trigger: when an interest is approved on a deposit-free deal, check auto-close + issue vouchers
CREATE OR REPLACE FUNCTION public.trg_auto_close_deal_from_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deal RECORD;
  v_paid int;
BEGIN
  IF NEW.lead_status IS DISTINCT FROM 'approved' THEN RETURN NEW; END IF;

  SELECT id, target_participants, status, auto_closed_at, deposit_required, deposit_amount
    INTO v_deal
  FROM public.deals WHERE id::text = NEW.deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN NEW; END IF;

  -- Only relevant for deposit-free deals (paid-deposit path is handled elsewhere)
  IF COALESCE(v_deal.deposit_required, false) AND COALESCE(v_deal.deposit_amount, 0) > 0 THEN
    RETURN NEW;
  END IF;

  IF v_deal.auto_closed_at IS NULL AND v_deal.target_participants IS NOT NULL THEN
    v_paid := public.get_deal_paid_count(NEW.deal_id);
    IF v_paid >= v_deal.target_participants THEN
      UPDATE public.deals SET status = 'closed', auto_closed_at = now() WHERE id = v_deal.id;
      PERFORM public.issue_vouchers_for_deal(NEW.deal_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_close_deal_from_interest ON public.deal_interests;
CREATE TRIGGER trg_auto_close_deal_from_interest
AFTER INSERT OR UPDATE OF lead_status ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_close_deal_from_interest();

-- Update close_expired_deals to also issue vouchers (already does so via post-pass)
-- And ensure when deal is auto-closed by expiry, vouchers get issued for joined users
CREATE OR REPLACE FUNCTION public.close_expired_deals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
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
  LOOP
    PERFORM public.issue_vouchers_for_deal(v_row.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
