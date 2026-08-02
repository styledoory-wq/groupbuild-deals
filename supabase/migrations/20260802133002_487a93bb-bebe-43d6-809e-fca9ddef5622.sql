-- 1) platform_fees — price-band rules (extensible)
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  fee_type text NOT NULL DEFAULT 'participation',
  min_deal_price numeric(12,2) NOT NULL DEFAULT 0,
  max_deal_price numeric(12,2),
  fee_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ILS',
  is_active boolean NOT NULL DEFAULT true,
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  offer_type text,
  listing_type text,
  priority integer NOT NULL DEFAULT 100,
  sort_order integer NOT NULL DEFAULT 0,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_fees_fee_amount_nonneg CHECK (fee_amount >= 0),
  CONSTRAINT platform_fees_min_nonneg CHECK (min_deal_price >= 0),
  CONSTRAINT platform_fees_max_gte_min CHECK (
    max_deal_price IS NULL OR max_deal_price >= min_deal_price
  )
);

CREATE INDEX IF NOT EXISTS platform_fees_active_price_idx
  ON public.platform_fees (is_active, fee_type, min_deal_price, max_deal_price);

CREATE INDEX IF NOT EXISTS platform_fees_priority_idx
  ON public.platform_fees (fee_type, priority, sort_order);

COMMENT ON TABLE public.platform_fees IS
  'Admin-managed platform fee rules (participation fees by deal-price band).';

-- 2) Snapshot columns on deposits for fee accounting
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'legacy_deposit',
  ADD COLUMN IF NOT EXISTS platform_fee_rule_id uuid REFERENCES public.platform_fees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_price_snapshot numeric(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(12,2);

CREATE INDEX IF NOT EXISTS deposits_payment_kind_status_idx
  ON public.deposits (payment_kind, status)
  WHERE is_deleted = false;

COMMENT ON COLUMN public.deposits.payment_kind IS
  'legacy_deposit | participation_fee';

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_platform_fees_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_fees_updated_at ON public.platform_fees;
CREATE TRIGGER trg_platform_fees_updated_at
  BEFORE UPDATE ON public.platform_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_fees_updated_at();

-- 4) Grants + RLS
GRANT SELECT ON public.platform_fees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_fees TO authenticated;
GRANT ALL ON public.platform_fees TO service_role;

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_fees_public_read_active" ON public.platform_fees;
CREATE POLICY "platform_fees_public_read_active"
  ON public.platform_fees
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "platform_fees_admin_all" ON public.platform_fees;
CREATE POLICY "platform_fees_admin_all"
  ON public.platform_fees
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Seed default participation fee bands (ILS)
INSERT INTO public.platform_fees (
  name, fee_type, min_deal_price, max_deal_price, fee_amount, is_active, priority, sort_order
)
SELECT * FROM (VALUES
  ('עד 2,000 ₪',       'participation', 0::numeric,      2000::numeric,    19::numeric, true, 100, 10),
  ('2,001–10,000 ₪',   'participation', 2001::numeric,   10000::numeric,   49::numeric, true, 100, 20),
  ('10,001–30,000 ₪',  'participation', 10001::numeric,  30000::numeric,   99::numeric, true, 100, 30),
  ('30,001–70,000 ₪',  'participation', 30001::numeric,  70000::numeric,  199::numeric, true, 100, 40),
  ('70,001–150,000 ₪', 'participation', 70001::numeric,  150000::numeric, 299::numeric, true, 100, 50),
  ('מעל 150,000 ₪',    'participation', 150001::numeric, NULL::numeric,   499::numeric, true, 100, 60)
) AS v(name, fee_type, min_deal_price, max_deal_price, fee_amount, is_active, priority, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_fees WHERE fee_type = 'participation'
);

-- 6) Resolver
CREATE OR REPLACE FUNCTION public.resolve_platform_fee(
  _deal_price numeric,
  _fee_type text DEFAULT 'participation',
  _category_id text DEFAULT NULL,
  _offer_type text DEFAULT NULL,
  _listing_type text DEFAULT NULL
)
RETURNS TABLE (
  rule_id uuid,
  fee_amount numeric,
  min_deal_price numeric,
  max_deal_price numeric,
  currency text,
  name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT
    f.id AS rule_id,
    f.fee_amount,
    f.min_deal_price,
    f.max_deal_price,
    f.currency,
    f.name
  FROM public.platform_fees f
  WHERE f.is_active = true
    AND f.fee_type = COALESCE(_fee_type, 'participation')
    AND COALESCE(_deal_price, 0) >= f.min_deal_price
    AND (f.max_deal_price IS NULL OR COALESCE(_deal_price, 0) <= f.max_deal_price)
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
$$;

GRANT EXECUTE ON FUNCTION public.resolve_platform_fee(numeric, text, text, text, text)
  TO anon, authenticated, service_role;

-- 7) Integrity trigger: allow service_role + participation_fee amounts
CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_settings RECORD;
  v_is_admin boolean;
  v_is_service boolean;
  v_is_supplier_direct boolean;
  v_is_supplier_confirm boolean;
  v_fee numeric;
  v_is_participation boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  v_is_service := COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  v_is_supplier_direct := (TG_OP = 'INSERT' AND NEW.payment_provider = 'direct_to_supplier');
  v_is_supplier_confirm := (TG_OP = 'UPDATE' AND current_setting('app.supplier_confirm_deposit', true) = 'on');
  v_is_participation := COALESCE(NEW.payment_kind, 'legacy_deposit') = 'participation_fee';

  SELECT payment_fee_absorber INTO v_settings FROM public.system_settings LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin AND NOT v_is_service AND NOT v_is_supplier_direct
       AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot create deposit for another user';
    END IF;

    SELECT id, status, is_deleted, deposit_amount, deposit_required
      INTO v_deal
      FROM public.deals
     WHERE id::text = NEW.deal_id
     LIMIT 1;

    IF v_deal.id IS NULL THEN RAISE EXCEPTION 'Deal not found: %', NEW.deal_id; END IF;
    IF COALESCE(v_deal.is_deleted, false) THEN RAISE EXCEPTION 'Deal is deleted'; END IF;
    IF v_deal.status <> 'active' THEN RAISE EXCEPTION 'Deal is not active'; END IF;

    IF v_is_participation THEN
      IF COALESCE(NEW.amount, 0) <= 0 THEN
        RAISE EXCEPTION 'Participation fee amount must be positive';
      END IF;
      NEW.platform_fee_amount := COALESCE(NEW.platform_fee_amount, NEW.amount);
      NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.platform_fee_amount, NEW.amount);
      NEW.supplier_deduction_amount := COALESCE(NEW.supplier_deduction_amount, 0);
      NEW.supplier_deduction_basis := COALESCE(NEW.supplier_deduction_basis, 'gross');
      NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, 'groupbuild');
      IF NOT v_is_admin AND NOT v_is_service THEN
        NEW.status := 'pending'::deposit_status;
        NEW.paid_at := NULL;
        NEW.refunded_at := NULL;
        NEW.is_deleted := false;
        NEW.deleted_at := NULL;
      END IF;
    ELSIF NOT v_is_admin AND NOT v_is_service AND NOT v_is_supplier_direct THEN
      NEW.amount := COALESCE(v_deal.deposit_amount, 0);
      IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Deal has no valid deposit amount'; END IF;
      NEW.status := 'pending'::deposit_status;
      NEW.paid_at := NULL;
      NEW.refunded_at := NULL;
      NEW.provider_transaction_id := NULL;
      NEW.provider_payment_url := NULL;
      NEW.is_deleted := false;
      NEW.deleted_at := NULL;
      NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    ELSE
      NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    END IF;

    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    IF NOT v_is_participation THEN
      NEW.supplier_deduction_basis := CASE
        WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross'
        ELSE 'net'
      END;
    END IF;
    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(COALESCE(NEW.gross_deposit_amount, NEW.amount) - v_fee, 0);
    IF NOT v_is_participation THEN
      NEW.supplier_deduction_amount := CASE
        WHEN NEW.supplier_deduction_basis = 'gross' THEN NEW.gross_deposit_amount
        ELSE NEW.net_deposit_amount
      END;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_is_admin AND NOT v_is_service AND NOT v_is_supplier_confirm THEN
      RAISE EXCEPTION 'Only admins can update deposits';
    END IF;

    IF v_is_supplier_confirm THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.deal_id IS DISTINCT FROM OLD.deal_id
        OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
        OR NEW.provider_transaction_id IS DISTINCT FROM OLD.provider_transaction_id
        OR NEW.provider_payment_url IS DISTINCT FROM OLD.provider_payment_url
        OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
        OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
        OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
        OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
        OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by THEN
        RAISE EXCEPTION 'Supplier confirmation can only mark an existing deposit as paid';
      END IF;

      IF NEW.status <> 'paid'::deposit_status THEN
        RAISE EXCEPTION 'Supplier confirmation can only mark deposit as paid';
      END IF;
    END IF;

    v_is_participation := COALESCE(NEW.payment_kind, OLD.payment_kind, 'legacy_deposit') = 'participation_fee';
    NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, OLD.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, OLD.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    IF v_is_participation THEN
      NEW.platform_fee_amount := COALESCE(NEW.platform_fee_amount, OLD.platform_fee_amount, NEW.amount);
      NEW.supplier_deduction_amount := COALESCE(NEW.supplier_deduction_amount, 0);
      NEW.supplier_deduction_basis := COALESCE(NEW.supplier_deduction_basis, OLD.supplier_deduction_basis, 'gross');
    ELSE
      NEW.supplier_deduction_basis := CASE
        WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross'
        ELSE 'net'
      END;
    END IF;
    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(NEW.gross_deposit_amount - v_fee, 0);
    IF NOT v_is_participation THEN
      NEW.supplier_deduction_amount := CASE
        WHEN NEW.supplier_deduction_basis = 'gross' THEN NEW.gross_deposit_amount
        ELSE NEW.net_deposit_amount
      END;
    END IF;

    IF NEW.status = 'paid'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.status = 'refunded'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.refunded_at IS NULL THEN
      NEW.refunded_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 8) Revenue report view
CREATE OR REPLACE VIEW public.participation_fee_revenue AS
SELECT
  d.id AS deposit_id,
  d.user_id,
  d.deal_id,
  d.supplier_id,
  d.amount,
  COALESCE(d.platform_fee_amount, d.amount) AS platform_fee_amount,
  d.deal_price_snapshot,
  d.platform_fee_rule_id,
  d.status,
  d.payment_provider,
  d.paid_at,
  d.refunded_at,
  d.created_at,
  date_trunc('month', COALESCE(d.paid_at, d.created_at)) AS revenue_month
FROM public.deposits d
WHERE d.is_deleted = false
  AND d.payment_kind = 'participation_fee';

GRANT SELECT ON public.participation_fee_revenue TO authenticated;