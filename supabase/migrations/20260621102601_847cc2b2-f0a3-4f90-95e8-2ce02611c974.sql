CREATE OR REPLACE FUNCTION public.supplier_confirm_deposit(_interest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_is_owner boolean;
  v_deposit_id uuid;
  v_amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT * INTO v_interest
  FROM public.deal_interests
  WHERE id = _interest_id
  LIMIT 1;

  IF v_interest.id IS NULL THEN RAISE EXCEPTION 'interest_not_found'; END IF;

  SELECT * INTO v_deal
  FROM public.deals
  WHERE id::text = v_interest.deal_id
  LIMIT 1;

  SELECT EXISTS(
    SELECT 1
    FROM public.suppliers s
    WHERE s.id = v_deal.supplier_id
      AND s.user_id = auth.uid()
  ) INTO v_is_owner;

  IF NOT v_is_owner AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  v_amount := COALESCE(v_interest.direct_deposit_amount, v_deal.deposit_amount, 0);

  UPDATE public.deal_interests
     SET direct_deposit_status = 'confirmed_by_supplier',
         supplier_confirmed_at = now(),
         supplier_confirmed_by = auth.uid(),
         lead_status = 'approved',
         status = 'paid',
         deposit_status = 'paid',
         updated_at = now()
   WHERE id = _interest_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.deposits
    WHERE user_id = v_interest.user_id
      AND deal_id = v_interest.deal_id
      AND COALESCE(is_deleted,false) = false
      AND status = 'paid'::deposit_status
  ) THEN
    INSERT INTO public.deposits (
      user_id,
      deal_id,
      amount,
      gross_deposit_amount,
      net_deposit_amount,
      payment_processing_fee_amount,
      payment_processing_fee_status,
      supplier_deduction_amount,
      supplier_deduction_basis,
      payment_fee_absorber,
      currency,
      payment_provider,
      status,
      paid_at,
      metadata
    ) VALUES (
      v_interest.user_id,
      v_interest.deal_id,
      v_amount,
      v_amount,
      v_amount,
      0,
      'final',
      v_amount,
      'net',
      'supplier',
      'ILS',
      'direct_to_supplier',
      'paid'::deposit_status,
      now(),
      jsonb_build_object(
        'source','direct_to_supplier',
        'interest_id',_interest_id,
        'confirmed_by',auth.uid()
      )
    ) RETURNING id INTO v_deposit_id;
  END IF;

  PERFORM public.notify_user(
    v_interest.user_id,
    'הספק אישר את הפיקדון',
    'הספק אישר את קבלת הפיקדון. ההצטרפות שלך לעסקה הושלמה.',
    'deposit',
    '/my-offers',
    jsonb_build_object('interest_id', _interest_id)
  );

  PERFORM public.evaluate_conditional_joiners(v_interest.deal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_confirm_deposit(uuid) TO authenticated;