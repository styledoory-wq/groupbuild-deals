
-- 1. Deals: add supplier-direct payment fields
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS supplier_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS supplier_payment_instructions TEXT;

-- 2. deal_interests: add direct deposit tracking fields
ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS direct_deposit_status TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS direct_deposit_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS resident_marked_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supplier_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supplier_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS supplier_dispute_reason TEXT;

-- 3. suppliers: extended monetization
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS lead_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_fee_type TEXT NOT NULL DEFAULT 'percent';

-- 4. RPC: resident marks deposit as paid (directly to supplier)
CREATE OR REPLACE FUNCTION public.resident_mark_deposit_paid(_interest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_supplier_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_interest FROM public.deal_interests
    WHERE id = _interest_id AND COALESCE(is_deleted,false)=false LIMIT 1;
  IF v_interest.id IS NULL THEN RAISE EXCEPTION 'interest_not_found'; END IF;
  IF v_interest.user_id <> auth.uid() THEN RAISE EXCEPTION 'not_allowed'; END IF;

  SELECT * INTO v_deal FROM public.deals WHERE id::text = v_interest.deal_id LIMIT 1;

  UPDATE public.deal_interests
     SET direct_deposit_status = 'marked_paid_by_resident',
         direct_deposit_amount = COALESCE(direct_deposit_amount, v_deal.deposit_amount),
         resident_marked_paid_at = now(),
         lead_status = CASE WHEN lead_status IN ('new','pending') THEN 'pending' ELSE lead_status END,
         updated_at = now()
   WHERE id = _interest_id;

  SELECT s.user_id INTO v_supplier_user
    FROM public.deals d JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id::text = v_interest.deal_id LIMIT 1;

  IF v_supplier_user IS NOT NULL THEN
    PERFORM public.notify_user(
      v_supplier_user,
      'דייר סימן ששילם פיקדון',
      'דייר דיווח שהעביר פיקדון ישירות אליך. אנא אשר את הקבלה במסך הלידים.',
      'deposit',
      '/supplier/leads',
      jsonb_build_object('interest_id', _interest_id, 'deal_id', v_interest.deal_id)
    );
  END IF;
END;
$$;

-- 5. RPC: supplier confirms deposit received → triggers full join flow
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
  SELECT * INTO v_interest FROM public.deal_interests WHERE id = _interest_id LIMIT 1;
  IF v_interest.id IS NULL THEN RAISE EXCEPTION 'interest_not_found'; END IF;
  SELECT * INTO v_deal FROM public.deals WHERE id::text = v_interest.deal_id LIMIT 1;

  SELECT EXISTS(
    SELECT 1 FROM public.suppliers s WHERE s.id = v_deal.supplier_id AND s.user_id = auth.uid()
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

  -- Mirror to deposits so vouchers/auto-close/counts keep working
  IF NOT EXISTS (
    SELECT 1 FROM public.deposits
     WHERE user_id = v_interest.user_id AND deal_id = v_interest.deal_id
       AND COALESCE(is_deleted,false)=false AND status='paid'::deposit_status
  ) THEN
    INSERT INTO public.deposits (
      user_id, deal_id, amount, gross_deposit_amount, net_deposit_amount,
      supplier_deduction_amount, supplier_deduction_basis, payment_fee_absorber,
      payment_processing_fee_status, currency, payment_provider, status, paid_at,
      metadata
    ) VALUES (
      v_interest.user_id, v_interest.deal_id, v_amount, v_amount, v_amount,
      0, 'gross', 'supplier',
      'not_applicable', 'ILS', 'direct_to_supplier', 'paid'::deposit_status, now(),
      jsonb_build_object('source','direct_to_supplier','interest_id',_interest_id,'confirmed_by',auth.uid())
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

  -- Re-run auto-close check
  PERFORM public.evaluate_conditional_joiners(v_interest.deal_id);
END;
$$;

-- 6. RPC: supplier disputes the resident's "I paid" claim
CREATE OR REPLACE FUNCTION public.supplier_dispute_deposit(_interest_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_deal public.deals%ROWTYPE;
  v_is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_interest FROM public.deal_interests WHERE id = _interest_id LIMIT 1;
  IF v_interest.id IS NULL THEN RAISE EXCEPTION 'interest_not_found'; END IF;
  SELECT * INTO v_deal FROM public.deals WHERE id::text = v_interest.deal_id LIMIT 1;
  SELECT EXISTS(
    SELECT 1 FROM public.suppliers s WHERE s.id = v_deal.supplier_id AND s.user_id = auth.uid()
  ) INTO v_is_owner;
  IF NOT v_is_owner AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.deal_interests
     SET direct_deposit_status = 'disputed',
         supplier_dispute_reason = _reason,
         updated_at = now()
   WHERE id = _interest_id;

  PERFORM public.notify_user(
    v_interest.user_id,
    'הספק לא אישר את הפיקדון',
    COALESCE('סיבה: ' || _reason, 'הספק מציין כי טרם התקבל הפיקדון. אנא צור קשר עם הספק.'),
    'deposit',
    '/my-offers',
    jsonb_build_object('interest_id', _interest_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resident_mark_deposit_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_confirm_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_dispute_deposit(uuid, text) TO authenticated;
