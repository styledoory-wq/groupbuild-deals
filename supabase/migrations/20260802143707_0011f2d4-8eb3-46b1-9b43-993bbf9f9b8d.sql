-- 1. New deposit status for abandoned checkouts
ALTER TYPE public.deposit_status ADD VALUE IF NOT EXISTS 'expired';

-- 2. Test / Production separation on every deposit
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS payment_environment text;

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_payment_environment_check;
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_payment_environment_check
  CHECK (payment_environment IS NULL OR payment_environment IN ('test','production'));

CREATE INDEX IF NOT EXISTS idx_deposits_payment_environment
  ON public.deposits (payment_environment);

CREATE INDEX IF NOT EXISTS idx_deposits_pending_created
  ON public.deposits (status, created_at)
  WHERE status = 'pending';

-- 3. resolve_platform_fee must fail for non-positive prices
CREATE OR REPLACE FUNCTION public.resolve_platform_fee(
  _deal_price numeric,
  _fee_type text DEFAULT 'participation'::text,
  _category_id text DEFAULT NULL::text,
  _offer_type text DEFAULT NULL::text,
  _listing_type text DEFAULT NULL::text
)
RETURNS TABLE(rule_id uuid, fee_amount numeric, min_deal_price numeric, max_deal_price numeric, currency text, name text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    f.id AS rule_id,
    f.fee_amount,
    f.min_deal_price,
    f.max_deal_price,
    f.currency,
    f.name
  FROM public.platform_fees f
  WHERE f.is_active = true
    AND _deal_price IS NOT NULL
    AND _deal_price > 0
    AND f.fee_type = COALESCE(_fee_type, 'participation')
    AND _deal_price >= f.min_deal_price
    AND (f.max_deal_price IS NULL OR _deal_price <= f.max_deal_price)
    AND (f.category_id IS NULL OR f.category_id = _category_id)
    AND (f.offer_type IS NULL OR f.offer_type = _offer_type)
    AND (f.listing_type IS NULL OR f.listing_type = _listing_type)
  ORDER BY
    (CASE WHEN f.category_id IS NOT NULL THEN 0 ELSE 1 END),
    (CASE WHEN f.offer_type IS NOT NULL THEN 0 ELSE 1 END),
    (CASE WHEN f.listing_type IS NOT NULL THEN 0 ELSE 1 END),
    f.priority ASC,
    f.sort_order ASC,
    f.created_at ASC
  LIMIT 1;
$function$;

-- 4. Legacy manual-payment functions may no longer touch participation fees
CREATE OR REPLACE FUNCTION public.confirm_deposit_received(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_supplier BOOLEAN;
  _is_admin BOOLEAN;
  _kind TEXT;
BEGIN
  SELECT payment_kind INTO _kind FROM public.deposits WHERE id = _deposit_id;
  IF _kind IS NULL THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;
  IF _kind = 'participation_fee' THEN
    RAISE EXCEPTION 'participation_fee_requires_payment_provider';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.deposits d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = _deposit_id AND s.user_id = auth.uid()
  ) INTO _is_supplier;
  SELECT public.has_role(auth.uid(), 'admin') INTO _is_admin;
  IF NOT (_is_supplier OR _is_admin) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.deposits
  SET status = 'paid', paid_at = now(), confirmed_by = auth.uid()
  WHERE id = _deposit_id AND status IN ('awaiting_confirmation', 'pending');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found_or_invalid_state';
  END IF;

  INSERT INTO public.deposit_audit_log (deposit_id, user_id, action, metadata)
  VALUES (_deposit_id, auth.uid(), 'legacy_confirm_received', jsonb_build_object('payment_kind', _kind));
END;
$function$;

CREATE OR REPLACE FUNCTION public.declare_deposit_paid(_deposit_id uuid, _method text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _kind TEXT;
  _owner UUID;
BEGIN
  SELECT payment_kind, user_id INTO _kind, _owner FROM public.deposits WHERE id = _deposit_id;
  IF _kind IS NULL THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;
  IF _kind = 'participation_fee' THEN
    RAISE EXCEPTION 'participation_fee_requires_payment_provider';
  END IF;
  IF _owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.deposits
  SET status = 'awaiting_confirmation',
      declared_paid_at = now(),
      declared_payment_method = _method
  WHERE id = _deposit_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found_or_invalid_state';
  END IF;

  INSERT INTO public.deposit_audit_log (deposit_id, user_id, action, metadata)
  VALUES (_deposit_id, auth.uid(), 'legacy_declare_paid', jsonb_build_object('method', _method));
END;
$function$;

-- 5. Documented, audited admin-only override for participation fees
CREATE OR REPLACE FUNCTION public.admin_override_participation_payment(
  _deposit_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _kind TEXT;
  _status public.deposit_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 10 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT payment_kind, status INTO _kind, _status
  FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _kind IS NULL THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;
  IF _status = 'paid' THEN
    RAISE EXCEPTION 'already_paid';
  END IF;

  UPDATE public.deposits
  SET status = 'paid', paid_at = now(), confirmed_by = auth.uid()
  WHERE id = _deposit_id;

  INSERT INTO public.deposit_audit_log (deposit_id, user_id, action, metadata)
  VALUES (
    _deposit_id,
    auth.uid(),
    'admin_override_paid',
    jsonb_build_object('reason', btrim(_reason), 'previous_status', _status, 'payment_kind', _kind)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_override_participation_payment(uuid, text) TO authenticated;

-- 6. Cleanup job helper for abandoned checkouts
CREATE OR REPLACE FUNCTION public.expire_stale_pending_deposits(_older_than_minutes integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
BEGIN
  WITH updated AS (
    UPDATE public.deposits
    SET status = 'expired'
    WHERE status = 'pending'
      AND payment_kind = 'participation_fee'
      AND created_at < now() - make_interval(mins => GREATEST(_older_than_minutes, 5))
    RETURNING id
  )
  INSERT INTO public.deposit_audit_log (deposit_id, user_id, action, metadata)
  SELECT id, NULL, 'auto_expired', jsonb_build_object('older_than_minutes', _older_than_minutes)
  FROM updated;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$function$;

-- 7. Percentage offers must carry a base price and a discount percentage
CREATE OR REPLACE FUNCTION public.enforce_percentage_deal_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.offer_type = 'percentage' AND NEW.status = 'active' AND COALESCE(NEW.is_deleted, false) = false THEN
    IF NEW.base_price IS NULL OR NEW.base_price <= 0 THEN
      RAISE EXCEPTION 'percentage_deal_requires_base_price';
    END IF;
    IF NEW.discount_percentage IS NULL OR NEW.discount_percentage <= 0 THEN
      RAISE EXCEPTION 'percentage_deal_requires_discount_percentage';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_percentage_deal_pricing_trg ON public.deals;
CREATE TRIGGER enforce_percentage_deal_pricing_trg
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.enforce_percentage_deal_pricing();