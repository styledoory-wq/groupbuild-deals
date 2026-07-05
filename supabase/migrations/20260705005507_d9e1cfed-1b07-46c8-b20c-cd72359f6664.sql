CREATE OR REPLACE FUNCTION public.validate_deal_offer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t jsonb;
  cnt int;
  i int;
  min_p int;
  max_p int;
  pct numeric;
  before_p numeric;
  after_p numeric;
BEGIN
  -- Regular offers are simple catalogue prices, not group-buy discounts.
  -- They must not require discount_percentage, discounted_price, or tiers.
  IF COALESCE(NEW.listing_type, 'group_buy') = 'regular' THEN
    IF NEW.original_price IS NULL OR NEW.original_price <= 0 THEN
      RAISE EXCEPTION 'יש להזין מחיר תקין';
    END IF;

    NEW.discount_percentage := NULL;
    NEW.discounted_price := NULL;
    NEW.base_price := NULL;
    NEW.deposit_required := FALSE;
    NEW.deposit_amount := 0;
    NEW.supplier_payment_link := NULL;
    NEW.supplier_payment_instructions := NULL;
    NEW.tiers := '[]'::jsonb;

    RETURN NEW;
  END IF;

  -- If tiers array is present and non-empty, validate each tier and skip top-level checks.
  IF NEW.tiers IS NOT NULL AND jsonb_typeof(NEW.tiers) = 'array' AND jsonb_array_length(NEW.tiers) > 0 THEN
    cnt := jsonb_array_length(NEW.tiers);
    FOR i IN 0..cnt-1 LOOP
      t := NEW.tiers -> i;

      IF (t ->> 'minParticipants') IS NULL THEN
        RAISE EXCEPTION 'מדרגה %: חסר מינימום מצטרפים', i + 1;
      END IF;
      min_p := (t ->> 'minParticipants')::int;
      IF min_p < 1 THEN
        RAISE EXCEPTION 'מדרגה %: מינימום מצטרפים חייב להיות 1 ומעלה', i + 1;
      END IF;

      IF (t ->> 'maxParticipants') IS NOT NULL AND (t ->> 'maxParticipants') <> '' THEN
        max_p := (t ->> 'maxParticipants')::int;
        IF max_p < min_p THEN
          RAISE EXCEPTION 'מדרגה %: מקסימום מצטרפים חייב להיות גדול או שווה למינימום', i + 1;
        END IF;
      END IF;

      IF NEW.offer_type = 'percentage' THEN
        IF (t ->> 'discount_percentage') IS NULL THEN
          RAISE EXCEPTION 'מדרגה %: חסר אחוז הנחה', i + 1;
        END IF;
        pct := (t ->> 'discount_percentage')::numeric;
        IF pct <= 0 OR pct > 100 THEN
          RAISE EXCEPTION 'מדרגה %: אחוז הנחה חייב להיות בין 1 ל-100', i + 1;
        END IF;
      ELSIF NEW.offer_type = 'price_comparison' THEN
        IF (t ->> 'original_price') IS NULL OR (t ->> 'discounted_price') IS NULL THEN
          RAISE EXCEPTION 'מדרגה %: חסרים מחירים', i + 1;
        END IF;
        before_p := (t ->> 'original_price')::numeric;
        after_p := (t ->> 'discounted_price')::numeric;
        IF before_p <= 0 OR after_p <= 0 THEN
          RAISE EXCEPTION 'מדרגה %: מחירים חייבים להיות חיוביים', i + 1;
        END IF;
        IF after_p >= before_p THEN
          RAISE EXCEPTION 'מדרגה %: המחיר אחרי חייב להיות קטן מהמחיר לפני', i + 1;
        END IF;
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  -- Fallback: legacy non-tiered group-buy validation.
  IF NEW.offer_type = 'percentage' THEN
    IF NEW.discount_percentage IS NULL OR NEW.discount_percentage <= 0 OR NEW.discount_percentage > 100 THEN
      RAISE EXCEPTION 'אחוז ההנחה חייב להיות בין 1 ל-100';
    END IF;
  ELSIF NEW.offer_type = 'price_comparison' THEN
    IF NEW.original_price IS NULL OR NEW.original_price <= 0 THEN
      RAISE EXCEPTION 'יש להזין מחיר מקורי תקין';
    END IF;
    IF NEW.discounted_price IS NULL OR NEW.discounted_price <= 0 THEN
      RAISE EXCEPTION 'יש להזין מחיר אחרי הנחה תקין';
    END IF;
    IF NEW.discounted_price >= NEW.original_price THEN
      RAISE EXCEPTION 'המחיר אחרי הנחה חייב להיות קטן מהמחיר לפני';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;