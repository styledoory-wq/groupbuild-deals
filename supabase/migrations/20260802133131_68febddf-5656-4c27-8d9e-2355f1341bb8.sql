-- =========================================================
-- M2: classify legacy deal_interests (no deletions)
-- =========================================================
ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS participation_status text;

COMMENT ON COLUMN public.deal_interests.participation_status IS
  'paid | legacy_confirmed | unpaid_legacy | abandoned | cancelled — only paid + legacy_confirmed count towards participants';

-- paid: has a confirmed participation-fee deposit
UPDATE public.deal_interests di
SET participation_status = 'paid'
WHERE di.participation_status IS NULL
  AND EXISTS (
    SELECT 1 FROM public.deposits d
    WHERE d.user_id = di.user_id
      AND d.deal_id = di.deal_id
      AND d.status = 'paid'::deposit_status
      AND COALESCE(d.is_deleted, false) = false
      AND COALESCE(d.payment_kind, 'legacy_deposit') = 'participation_fee'
  );

-- legacy_confirmed: pre-existing legitimate joins (created before the fee system,
-- or already marked paid/confirmed through the legacy deposit flow)
UPDATE public.deal_interests di
SET participation_status = 'legacy_confirmed'
WHERE di.participation_status IS NULL
  AND (
    di.status IN ('paid', 'confirmed', 'approved')
    OR di.deposit_status = 'paid'
    OR di.direct_deposit_status = 'paid'
    OR EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = di.user_id
        AND d.deal_id = di.deal_id
        AND d.status = 'paid'::deposit_status
        AND COALESCE(d.is_deleted, false) = false
    )
  );

UPDATE public.deal_interests
SET participation_status = 'cancelled'
WHERE participation_status IS NULL
  AND (COALESCE(is_deleted, false) = true OR status IN ('cancelled', 'declined', 'rejected'));

-- everything else that never completed payment
UPDATE public.deal_interests
SET participation_status = 'unpaid_legacy'
WHERE participation_status IS NULL;

ALTER TABLE public.deal_interests
  ALTER COLUMN participation_status SET DEFAULT 'abandoned';

CREATE INDEX IF NOT EXISTS deal_interests_participation_status_idx
  ON public.deal_interests (deal_id, participation_status)
  WHERE is_deleted = false;

-- =========================================================
-- Deal-level participation fee lock
-- =========================================================
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS participation_fee_base_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS participation_fee_rule_id uuid REFERENCES public.platform_fees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participation_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS participation_fee_locked_at timestamptz;

COMMENT ON COLUMN public.deals.participation_fee_locked_at IS
  'Set atomically on the first checkout for this deal. Once set, all participants pay the same locked fee.';

-- Atomic lock: first caller wins, everyone else receives the locked values.
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

  SELECT * INTO v_row FROM public.deals WHERE id = _deal_id FOR UPDATE;
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

  UPDATE public.deals
     SET participation_fee_base_price = _base_price,
         participation_fee_rule_id    = _rule_id,
         participation_fee_amount     = _fee_amount,
         participation_fee_locked_at  = now()
   WHERE id = _deal_id
   RETURNING participation_fee_base_price,
             participation_fee_rule_id,
             participation_fee_amount,
             participation_fee_locked_at
    INTO base_price, rule_id, fee_amount, locked_at;

  was_already_locked := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_deal_participation_fee(text, numeric, uuid, numeric) TO service_role;

-- =========================================================
-- Audit log for platform_fees changes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platform_fee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id uuid,
  action text NOT NULL,
  actor_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_fee_audit_log_created_idx
  ON public.platform_fee_audit_log (created_at DESC);

GRANT SELECT ON public.platform_fee_audit_log TO authenticated;
GRANT ALL ON public.platform_fee_audit_log TO service_role;

ALTER TABLE public.platform_fee_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_fee_audit_admin_read" ON public.platform_fee_audit_log;
CREATE POLICY "platform_fee_audit_admin_read"
  ON public.platform_fee_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_platform_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.platform_fee_audit_log (fee_id, action, actor_id, new_values)
    VALUES (NEW.id, 'insert', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.platform_fee_audit_log (fee_id, action, actor_id, old_values, new_values)
    VALUES (NEW.id, 'update', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO public.platform_fee_audit_log (fee_id, action, actor_id, old_values)
    VALUES (OLD.id, 'delete', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_fees_audit ON public.platform_fees;
CREATE TRIGGER trg_platform_fees_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_fees
  FOR EACH ROW EXECUTE FUNCTION public.log_platform_fee_change();

-- =========================================================
-- Close band gaps (fractional prices like 2000.50)
-- =========================================================
UPDATE public.platform_fees SET min_deal_price = 2000.01   WHERE fee_type='participation' AND min_deal_price = 2001;
UPDATE public.platform_fees SET min_deal_price = 10000.01  WHERE fee_type='participation' AND min_deal_price = 10001;
UPDATE public.platform_fees SET min_deal_price = 30000.01  WHERE fee_type='participation' AND min_deal_price = 30001;
UPDATE public.platform_fees SET min_deal_price = 70000.01  WHERE fee_type='participation' AND min_deal_price = 70001;
UPDATE public.platform_fees SET min_deal_price = 150000.01 WHERE fee_type='participation' AND min_deal_price = 150001;

-- View should respect the caller's RLS
ALTER VIEW public.participation_fee_revenue SET (security_invoker = on);