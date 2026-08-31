-- Per-deal participation fee controls + query indexes
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS participation_fee_override_mode text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS participation_fee_override_amount numeric;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_participation_fee_override_mode_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_participation_fee_override_mode_check
  CHECK (participation_fee_override_mode IN ('inherit','enabled','disabled'));

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_participation_fee_override_amount_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_participation_fee_override_amount_check
  CHECK (participation_fee_override_amount IS NULL OR participation_fee_override_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_deals_public_load
  ON public.deals (status, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_interests_counts
  ON public.deal_interests (deal_id, status, is_deleted, user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_deal_status
  ON public.deposits (deal_id, status, is_deleted);

CREATE OR REPLACE FUNCTION public.get_effective_participation_fee_mode(_deal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global text;
  v_override text;
BEGIN
  v_global := public.get_participation_fee_mode();
  SELECT participation_fee_override_mode
    INTO v_override
    FROM public.deals
   WHERE id = _deal_id AND is_deleted = false;

  IF v_override = 'disabled' THEN RETURN 'disabled'; END IF;
  IF v_override = 'enabled' THEN RETURN 'enabled'; END IF;
  RETURN v_global;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_effective_participation_fee_mode(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_deal_participation_fee(
  _deal_id uuid,
  _mode text,
  _amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _mode NOT IN ('inherit','enabled','disabled') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;
  IF _mode = 'enabled' AND (_amount IS NULL OR _amount <= 0) THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF _mode = 'enabled' THEN
    UPDATE public.deals
       SET participation_fee_override_mode = 'enabled',
           participation_fee_override_amount = _amount,
           participation_fee_amount = _amount,
           participation_fee_rule_id = NULL,
           participation_fee_locked_at = now(),
           updated_at = now()
     WHERE id = _deal_id AND is_deleted = false;
  ELSIF _mode = 'disabled' THEN
    UPDATE public.deals
       SET participation_fee_override_mode = 'disabled',
           participation_fee_override_amount = 0,
           participation_fee_amount = NULL,
           participation_fee_rule_id = NULL,
           participation_fee_locked_at = NULL,
           updated_at = now()
     WHERE id = _deal_id AND is_deleted = false;
  ELSE
    UPDATE public.deals
       SET participation_fee_override_mode = 'inherit',
           participation_fee_override_amount = NULL,
           participation_fee_amount = NULL,
           participation_fee_rule_id = NULL,
           participation_fee_locked_at = NULL,
           updated_at = now()
     WHERE id = _deal_id AND is_deleted = false;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'deal_not_found'; END IF;
  RETURN jsonb_build_object('ok', true, 'deal_id', _deal_id, 'mode', _mode, 'amount', _amount);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_deal_participation_fee(uuid,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_deal_participation_fee(uuid,text,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.join_deal_free_effective(
  _deal_id uuid,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_mode text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT public.get_effective_participation_fee_mode(_deal_id) INTO v_mode;
  IF v_mode <> 'disabled' THEN RAISE EXCEPTION 'free_join_not_allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deals WHERE id=_deal_id AND is_deleted=false AND status='active') THEN
    RAISE EXCEPTION 'deal_not_active';
  END IF;

  SELECT id INTO v_id
    FROM public.deal_interests
   WHERE deal_id=_deal_id AND user_id=v_uid AND is_deleted=false
     AND status IN ('interested','committed','paid','pending_deposit','joined','approved')
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.deal_interests (
    deal_id,user_id,status,lead_status,deposit_required,deposit_amount,deposit_status,
    full_name,phone,city,project_name,notes,estimated_quantity,join_condition,
    terms_accepted_at,participation_status
  ) VALUES (
    _deal_id,v_uid,'joined','new',false,0,'not_required',
    NULLIF(_payload->>'full_name',''),NULLIF(_payload->>'phone',''),NULLIF(_payload->>'city',''),
    NULLIF(_payload->>'project_name',''),NULLIF(_payload->>'notes',''),
    CASE WHEN COALESCE(_payload->>'estimated_quantity','') ~ '^[0-9]+$' THEN (_payload->>'estimated_quantity')::numeric ELSE NULL END,
    COALESCE(NULLIF(_payload->>'join_condition',''),'flexible'),now(),'joined'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.join_deal_free_effective(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_deal_free_effective(uuid,jsonb) TO authenticated, service_role;
