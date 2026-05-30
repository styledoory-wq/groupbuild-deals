
-- Gate voucher issuance to closed deals only and clean up vouchers wrongly issued for active deals
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
  SELECT id, supplier_id, redemption_deadline, deposit_required, deposit_amount, status, auto_closed_at
    INTO v_deal
  FROM public.deals WHERE id::text = _deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN 0; END IF;

  -- Vouchers may only be issued once the deal has actually closed
  -- (either via auto-close on target reached / expiry, or a manual status change).
  IF v_deal.status <> 'closed' AND v_deal.auto_closed_at IS NULL THEN
    RETURN 0;
  END IF;

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

-- Remove vouchers that were wrongly issued for deals still active (never redeemed)
DELETE FROM public.voucher_audit_log
 WHERE voucher_id IN (
   SELECT v.id FROM public.vouchers v
   JOIN public.deals d ON d.id::text = v.deal_id
   WHERE d.status = 'active' AND COALESCE(d.auto_closed_at, NULL) IS NULL
     AND v.status <> 'redeemed'
 );
DELETE FROM public.vouchers v
 USING public.deals d
 WHERE d.id::text = v.deal_id
   AND d.status = 'active'
   AND d.auto_closed_at IS NULL
   AND v.status <> 'redeemed';
