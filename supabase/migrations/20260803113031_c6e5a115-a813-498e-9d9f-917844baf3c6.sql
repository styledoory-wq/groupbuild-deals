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
  SELECT * INTO d FROM public.deals WHERE d.id::text = _deal_id AND COALESCE(d.is_deleted,false) = false;
  IF d.id IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::numeric, NULL::numeric, NULL::uuid, 'ILS'::text, 'deal_not_found'::text;
    RETURN;
  END IF;

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
  WHERE c.id::text = d.category_id::text;

  v_mode := COALESCE(v_mode, 'price_based');

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
  ELSE
    v_price := NULLIF(d.base_price, 0);
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

  IF v_cat_amount IS NOT NULL AND v_cat_amount > 0 THEN
    RETURN QUERY SELECT 'category_fixed'::text, v_cat_amount, NULL::numeric, NULL::uuid, 'ILS'::text, 'ok'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::text, NULL::numeric, NULL::numeric, NULL::uuid, 'ILS'::text, 'fee_not_configured'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_deal_participation_fee(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_deal_participation_fee(text) TO authenticated, service_role;