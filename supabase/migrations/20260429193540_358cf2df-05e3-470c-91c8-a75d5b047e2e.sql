-- Add offer type and price comparison fields to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS discount_percentage numeric,
  ADD COLUMN IF NOT EXISTS discounted_price numeric,
  ADD COLUMN IF NOT EXISTS base_price numeric;

-- Restrict offer_type values
ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_offer_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_offer_type_check
  CHECK (offer_type IN ('percentage', 'price_comparison', 'tiers'));

-- Validation trigger: ensure required fields per type
CREATE OR REPLACE FUNCTION public.validate_deal_offer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS validate_deal_offer_trigger ON public.deals;
CREATE TRIGGER validate_deal_offer_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.validate_deal_offer();