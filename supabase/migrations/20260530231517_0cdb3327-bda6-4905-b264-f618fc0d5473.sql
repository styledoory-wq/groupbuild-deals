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
  v_voucher_id uuid;
  v_supplier_user uuid;
BEGIN
  SELECT id, supplier_id, redemption_deadline, deposit_required, deposit_amount, status, auto_closed_at, title
    INTO v_deal
  FROM public.deals WHERE id::text = _deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN 0; END IF;

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
            COALESCE(v_deal.redemption_deadline, now() + interval '90 days'), 'eligible')
    RETURNING id INTO v_voucher_id;

    INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
    VALUES (v_voucher_id, NULL, 'issued', jsonb_build_object('deal_id', _deal_id));

    -- Notify resident (only for newly issued vouchers)
    PERFORM public.notify_user(
      v_row.user_id,
      'ההצעה נסגרה — השובר שלך מוכן! 🎉',
      'יצרנו עבורך שובר מימוש. היכנס ל"ההטבות שלי" להצגת ה-QR.',
      'deal',
      '/my-vouchers',
      jsonb_build_object('deal_id', _deal_id, 'voucher_id', v_voucher_id)
    );

    v_count := v_count + 1;
  END LOOP;

  -- Notify supplier once if any new vouchers were issued
  IF v_count > 0 THEN
    SELECT user_id INTO v_supplier_user FROM public.suppliers WHERE id = v_deal.supplier_id LIMIT 1;
    IF v_supplier_user IS NOT NULL THEN
      PERFORM public.notify_user(
        v_supplier_user,
        'ההצעה נסגרה — יש זכאים למימוש',
        v_count::text || ' שוברים הופקו ומוכנים למימוש.',
        'deal',
        '/supplier/redemptions',
        jsonb_build_object('deal_id', _deal_id, 'vouchers_count', v_count)
      );
    END IF;
  END IF;

  RETURN v_count;
END;
$function$;