CREATE OR REPLACE FUNCTION public.lock_deal_participation_fee(
  _deal_id text,
  _base_price numeric,
  _rule_id uuid,
  _fee_amount numeric,
  _source text DEFAULT 'price_band'
)
RETURNS TABLE (
  base_price numeric,
  rule_id uuid,
  fee_amount numeric,
  locked_at timestamptz,
  was_already_locked boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.deals%ROWTYPE;
  v_source text := COALESCE(_source, 'price_band');
BEGIN
  IF v_source NOT IN ('price_band','category_fixed') THEN
    RAISE EXCEPTION 'Invalid participation fee source';
  END IF;
  IF _fee_amount IS NULL OR _fee_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid participation fee lock input';
  END IF;
  IF v_source = 'price_band' AND (_rule_id IS NULL OR _base_price IS NULL OR _base_price <= 0) THEN
    RAISE EXCEPTION 'Invalid participation fee lock input';
  END IF;

  SELECT dl.*
    INTO v_row
    FROM public.deals dl
   WHERE dl.id::text = _deal_id
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found: %', _deal_id;
  END IF;

  IF v_row.participation_fee_locked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_row.participation_fee_base_price,
                        v_row.participation_fee_rule_id,
                        v_row.participation_fee_amount,
                        v_row.participation_fee_locked_at,
                        true,
                        COALESCE(v_row.participation_fee_source,'price_band');
    RETURN;
  END IF;

  UPDATE public.deals dl
     SET participation_fee_base_price = _base_price,
         participation_fee_rule_id = _rule_id,
         participation_fee_amount = _fee_amount,
         participation_fee_source = v_source,
         participation_fee_locked_at = now()
   WHERE dl.id::text = _deal_id;

  RETURN QUERY SELECT _base_price, _rule_id, _fee_amount, now(), false, v_source;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.lock_deal_participation_fee(
  _deal_id text,
  _base_price numeric,
  _rule_id uuid,
  _fee_amount numeric
)
RETURNS TABLE (
  base_price numeric,
  rule_id uuid,
  fee_amount numeric,
  locked_at timestamptz,
  was_already_locked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.deals%ROWTYPE;
BEGIN
  IF _fee_amount IS NULL OR _fee_amount <= 0 OR _rule_id IS NULL
     OR _base_price IS NULL OR _base_price <= 0 THEN
    RAISE EXCEPTION 'Invalid participation fee lock input';
  END IF;

  SELECT dl.*
    INTO v_row
    FROM public.deals dl
   WHERE dl.id::text = _deal_id
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found: %', _deal_id;
  END IF;

  IF v_row.participation_fee_locked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_row.participation_fee_base_price,
                        v_row.participation_fee_rule_id,
                        v_row.participation_fee_amount,
                        v_row.participation_fee_locked_at,
                        true;
    RETURN;
  END IF;

  UPDATE public.deals dl
     SET participation_fee_base_price = _base_price,
         participation_fee_rule_id = _rule_id,
         participation_fee_amount = _fee_amount,
         participation_fee_locked_at = now()
   WHERE dl.id::text = _deal_id
   RETURNING dl.participation_fee_base_price,
             dl.participation_fee_rule_id,
             dl.participation_fee_amount,
             dl.participation_fee_locked_at
        INTO base_price, rule_id, fee_amount, locked_at;

  was_already_locked := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric) TO service_role;