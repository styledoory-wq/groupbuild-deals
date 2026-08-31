-- 1. Function EXECUTE grants
GRANT EXECUTE ON FUNCTION public.get_participation_fee_mode() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO anon, authenticated, service_role;

-- 2. Table grants
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;

-- 3. Referral-aware supplier approval (merged with existence check + updated_at)
CREATE OR REPLACE FUNCTION public.admin_approve_supplier(_supplier_id uuid, _approve boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exists boolean;
  v_ref_id uuid;
  v_grant jsonb;
  v_advance jsonb;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT true INTO v_exists FROM public.suppliers WHERE id = _supplier_id;
  IF v_exists IS NOT TRUE THEN
    RAISE EXCEPTION 'supplier_not_found';
  END IF;

  UPDATE public.suppliers
     SET approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         is_active = CASE WHEN _approve THEN true ELSE false END,
         updated_at = now()
   WHERE id = _supplier_id;

  v_advance := public.advance_referral_for_supplier(
    _supplier_id, CASE WHEN _approve THEN 'approved' ELSE 'rejected' END
  );

  IF _approve THEN
    SELECT id INTO v_ref_id
      FROM public.supplier_referrals
     WHERE invitee_supplier_id = _supplier_id
     LIMIT 1;

    IF v_ref_id IS NOT NULL THEN
      v_grant := public.grant_referral_reward(v_ref_id);
    ELSE
      v_grant := jsonb_build_object('ok', false, 'error', 'no_referral');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'approved', _approve,
    'approval_status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    'advance', v_advance,
    'grant', v_grant,
    'referral_id', v_ref_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_supplier(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_supplier(uuid, boolean) TO authenticated, service_role;

-- 4. Allow region-scoped deal visibility
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_visibility_type_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_visibility_type_check
  CHECK (visibility_type = ANY (ARRAY['public'::text, 'project_only'::text, 'region_only'::text]));