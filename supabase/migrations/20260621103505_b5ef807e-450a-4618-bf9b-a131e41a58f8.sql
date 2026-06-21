CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_settings RECORD;
  v_is_admin boolean;
  v_is_supplier_direct boolean;
  v_is_supplier_confirm boolean;
  v_fee numeric;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  v_is_supplier_direct := (TG_OP = 'INSERT' AND NEW.payment_provider = 'direct_to_supplier');
  v_is_supplier_confirm := (TG_OP = 'UPDATE' AND current_setting('app.supplier_confirm_deposit', true) = 'on');

  SELECT payment_fee_absorber INTO v_settings FROM public.system_settings LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin AND NOT v_is_supplier_direct AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot create deposit for another user';
    END IF;

    SELECT id, status, is_deleted, deposit_amount, deposit_required
      INTO v_deal
      FROM public.deals
     WHERE id::text = NEW.deal_id
     LIMIT 1;

    IF v_deal.id IS NULL THEN RAISE EXCEPTION 'Deal not found: %', NEW.deal_id; END IF;
    IF COALESCE(v_deal.is_deleted,false) THEN RAISE EXCEPTION 'Deal is deleted'; END IF;
    IF v_deal.status <> 'active' THEN RAISE EXCEPTION 'Deal is not active'; END IF;

    IF NOT v_is_admin AND NOT v_is_supplier_direct THEN
      NEW.amount := COALESCE(v_deal.deposit_amount, 0);
      IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Deal has no valid deposit amount'; END IF;
      NEW.status := 'pending'::deposit_status;
      NEW.paid_at := NULL;
      NEW.refunded_at := NULL;
      NEW.provider_transaction_id := NULL;
      NEW.provider_payment_url := NULL;
      NEW.is_deleted := false;
      NEW.deleted_at := NULL;
    END IF;

    NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    NEW.supplier_deduction_basis := CASE WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross' ELSE 'net' END;
    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(NEW.gross_deposit_amount - v_fee, 0);
    NEW.supplier_deduction_amount := CASE WHEN NEW.supplier_deduction_basis='gross' THEN NEW.gross_deposit_amount ELSE NEW.net_deposit_amount END;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_is_admin AND NOT v_is_supplier_confirm THEN
      RAISE EXCEPTION 'Only admins can update deposits';
    END IF;

    IF v_is_supplier_confirm THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.deal_id IS DISTINCT FROM OLD.deal_id
        OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
        OR NEW.provider_transaction_id IS DISTINCT FROM OLD.provider_transaction_id
        OR NEW.provider_payment_url IS DISTINCT FROM OLD.provider_payment_url
        OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
        OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
        OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
        OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
        OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by THEN
        RAISE EXCEPTION 'Supplier confirmation can only mark an existing deposit as paid';
      END IF;

      IF NEW.status <> 'paid'::deposit_status THEN
        RAISE EXCEPTION 'Supplier confirmation can only mark deposit as paid';
      END IF;
    END IF;

    NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, OLD.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, OLD.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    NEW.supplier_deduction_basis := CASE WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross' ELSE 'net' END;
    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(NEW.gross_deposit_amount - v_fee, 0);
    NEW.supplier_deduction_amount := CASE WHEN NEW.supplier_deduction_basis='gross' THEN NEW.gross_deposit_amount ELSE NEW.net_deposit_amount END;

    IF NEW.status='paid'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.status='refunded'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.refunded_at IS NULL THEN
      NEW.refunded_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.supplier_confirm_deposit(_interest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_is_owner boolean;
  v_deposit_id uuid;
  v_amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO v_interest
    FROM public.deal_interests
   WHERE id = _interest_id
   LIMIT 1;

  IF v_interest.id IS NULL THEN
    RAISE EXCEPTION 'interest_not_found';
  END IF;

  SELECT * INTO v_deal
    FROM public.deals
   WHERE id::text = v_interest.deal_id
   LIMIT 1;

  IF v_deal.id IS NULL THEN
    RAISE EXCEPTION 'deal_not_found';
  END IF;

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

  PERFORM set_config('app.supplier_confirm_deposit', 'on', true);

  UPDATE public.deal_interests
     SET direct_deposit_status = 'confirmed_by_supplier',
         supplier_confirmed_at = now(),
         supplier_confirmed_by = auth.uid(),
         lead_status = 'approved',
         status = 'paid',
         deposit_status = 'paid',
         updated_at = now()
   WHERE id = _interest_id;

  SELECT id INTO v_deposit_id
    FROM public.deposits
   WHERE user_id = v_interest.user_id
     AND deal_id = v_interest.deal_id
     AND COALESCE(is_deleted,false) = false
   ORDER BY CASE WHEN status = 'paid'::deposit_status THEN 0 ELSE 1 END, created_at DESC
   LIMIT 1;

  IF v_deposit_id IS NOT NULL THEN
    UPDATE public.deposits
       SET status = 'paid'::deposit_status,
           paid_at = COALESCE(paid_at, now()),
           amount = COALESCE(NULLIF(amount, 0), v_amount),
           gross_deposit_amount = COALESCE(NULLIF(gross_deposit_amount, 0), COALESCE(NULLIF(amount, 0), v_amount), v_amount),
           net_deposit_amount = COALESCE(NULLIF(net_deposit_amount, 0), COALESCE(NULLIF(amount, 0), v_amount), v_amount),
           payment_processing_fee_amount = COALESCE(payment_processing_fee_amount, 0),
           payment_processing_fee_status = CASE
             WHEN COALESCE(payment_processing_fee_amount, 0) = 0 THEN 'final'
             ELSE COALESCE(payment_processing_fee_status, 'final')
           END,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'supplier_direct_confirmation', true,
             'interest_id', _interest_id,
             'confirmed_by', auth.uid(),
             'confirmed_at', now()
           )
     WHERE id = v_deposit_id;
  ELSE
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
$function$;

GRANT EXECUTE ON FUNCTION public.supplier_confirm_deposit(uuid) TO authenticated;