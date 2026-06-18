
-- 1. Drop old check constraint
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_status_chk;

-- 2. Migrate intermediate statuses to a single in_progress
UPDATE public.vouchers
SET status = 'in_progress'
WHERE status IN ('appointment','measured','ordered','installed','completed');

-- 3. New simplified check constraint
ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_status_chk
  CHECK (status IN ('eligible','in_progress','redeemed','cancelled','expired'));

-- 4. Lookup RPC for supplier scan with clear errors
CREATE OR REPLACE FUNCTION public.lookup_voucher_for_supplier(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher public.vouchers%ROWTYPE;
  v_supplier_id uuid;
  v_deal record;
  v_profile record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT id INTO v_supplier_id FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1;
  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_supplier');
  END IF;

  SELECT * INTO v_voucher FROM public.vouchers WHERE code = upper(_code) LIMIT 1;
  IF v_voucher.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_voucher.supplier_id <> v_supplier_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_supplier');
  END IF;

  IF v_voucher.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed',
      'redeemed_at', v_voucher.redeemed_at);
  END IF;

  IF v_voucher.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelled');
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT title, discounted_price, original_price INTO v_deal
  FROM public.deals WHERE id = v_voucher.deal_id;

  SELECT full_name, project_id INTO v_profile
  FROM public.profiles WHERE id = v_voucher.user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'voucher', jsonb_build_object(
      'id', v_voucher.id,
      'code', v_voucher.code,
      'reference_number', v_voucher.reference_number,
      'status', v_voucher.status,
      'deal_id', v_voucher.deal_id,
      'deal_title', v_deal.title,
      'discounted_price', v_deal.discounted_price,
      'original_price', v_deal.original_price,
      'full_name', v_profile.full_name,
      'project_id', v_profile.project_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_voucher_for_supplier(text) TO authenticated;
