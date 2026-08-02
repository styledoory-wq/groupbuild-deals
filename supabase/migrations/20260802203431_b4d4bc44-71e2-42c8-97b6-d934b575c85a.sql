-- 1. Category-level participation fee configuration
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS participation_fee_mode text NOT NULL DEFAULT 'price_based',
  ADD COLUMN IF NOT EXISTS participation_fee_amount numeric;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_participation_fee_mode_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_participation_fee_mode_check
  CHECK (participation_fee_mode IN ('price_based','fixed'));

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_participation_fee_amount_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_participation_fee_amount_check
  CHECK (participation_fee_amount IS NULL OR participation_fee_amount >= 0);

-- 2. Track where the locked fee came from
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS participation_fee_source text;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_participation_fee_source_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_participation_fee_source_check
  CHECK (participation_fee_source IS NULL OR participation_fee_source IN ('price_band','category_fixed'));

-- 3. Automatic resolver: system decides, supplier has no influence
CREATE OR REPLACE FUNCTION public.resolve_deal_participation_fee(_deal_id text)
RETURNS TABLE(
  source text,
  fee_amount numeric,
  base_price numeric,
  rule_id uuid,
  currency text,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d public.deals%ROWTYPE;
  v_mode text;
  v_cat_amount numeric;
  v_price numeric;
  v_tier_price numeric;
  v_rule RECORD;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = _deal_id AND COALESCE(is_deleted,false) = false;
  IF d.id IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::numeric, NULL::numeric, NULL::uuid, 'ILS'::text, 'deal_not_found'::text;
    RETURN;
  END IF;

  -- Already locked → always return the locked values
  IF d.participation_fee_locked_at IS NOT NULL AND COALESCE(d.participation_fee_amount,0) > 0 THEN
    RETURN QUERY SELECT COALESCE(d.participation_fee_source,'price_band')::text,
                        d.participation_fee_amount,
                        d.participation_fee_base_price,
                        d.participation_fee_rule_id,
                        'ILS'::text,
                        'locked'::text;
    RETURN;
  END IF;

  SELECT c.participation_fee_mode, c.participation_fee_amount
    INTO v_mode, v_cat_amount
  FROM public.categories c
  WHERE c.id = d.category_id;

  v_mode := COALESCE(v_mode, 'price_based');

  -- Unambiguous price: only when the deal has a concrete final price.
  -- Percentage discounts / variable pricing are treated as ambiguous.
  IF COALESCE(d.offer_type,'percentage') <> 'percentage' THEN
    SELECT NULLIF((t->>'discounted_price')::numeric, 0)
      INTO v_tier_price
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(COALESCE(d.tiers,'[]'::jsonb)) = 'array'
                THEN COALESCE(d.tiers,'[]'::jsonb) ELSE '[]'::jsonb END
         ) AS t
    WHERE (t->>'discounted_price') ~ '^[0-9.]+$'
    ORDER BY COALESCE(NULLIF(t->>'minParticipants','')::numeric, 0) ASC
    LIMIT 1;

    v_price := COALESCE(v_tier_price, NULLIF(d.discounted_price, 0));
    IF v_price IS NOT NULL AND v_price <= 0 THEN v_price := NULL; END IF;
  END IF;

  IF v_mode = 'price_based' AND v_price IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM public.resolve_platform_fee(v_price, 'participation', d.category_id, d.offer_type, d.listing_type);

    IF v_rule.rule_id IS NOT NULL AND COALESCE(v_rule.fee_amount,0) > 0 THEN
      RETURN QUERY SELECT 'price_band'::text, v_rule.fee_amount, v_price, v_rule.rule_id,
                          COALESCE(v_rule.currency,'ILS'), 'ok'::text;
      RETURN;
    END IF;
  END IF;

  -- Ambiguous price (or no matching band) → category fixed fee
  IF v_cat_amount IS NOT NULL AND v_cat_amount > 0 THEN
    RETURN QUERY SELECT 'category_fixed'::text, v_cat_amount, NULL::numeric, NULL::uuid, 'ILS'::text, 'ok'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::text, NULL::numeric, NULL::numeric, NULL::uuid, 'ILS'::text, 'fee_not_configured'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_deal_participation_fee(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_deal_participation_fee(text) TO authenticated, service_role;

-- 4. Lock supports category-fixed fees (no rule_id / no base price)
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

  SELECT * INTO v_row FROM public.deals WHERE id = _deal_id FOR UPDATE;
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

  UPDATE public.deals
     SET participation_fee_base_price = _base_price,
         participation_fee_rule_id = _rule_id,
         participation_fee_amount = _fee_amount,
         participation_fee_source = v_source,
         participation_fee_locked_at = now()
   WHERE id = _deal_id;

  RETURN QUERY SELECT _base_price, _rule_id, _fee_amount, now(), false, v_source;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric, text) TO service_role;