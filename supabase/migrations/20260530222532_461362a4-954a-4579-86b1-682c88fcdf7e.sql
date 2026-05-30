-- Fix recursive RLS around deals/deal_interests and restore supplier visibility

CREATE OR REPLACE FUNCTION public.is_supplier_owner(_supplier_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.suppliers s
    WHERE s.id = _supplier_id
      AND s.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_for_deal(_deal_id text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id::text = _deal_id
      AND s.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_participates_in_deal(_deal_id text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deal_interests di
    WHERE di.deal_id = _deal_id
      AND di.user_id = _user_id
      AND COALESCE(di.is_deleted, false) = false
  )
  OR EXISTS (
    SELECT 1
    FROM public.vouchers v
    WHERE v.deal_id = _deal_id
      AND v.user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_supplier_owner(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_supplier_for_deal(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_participates_in_deal(text, uuid) TO authenticated;

-- Backfill supplier account links when the same email exists on profile + supplier.
UPDATE public.suppliers s
SET user_id = p.id,
    updated_at = now()
FROM public.profiles p
WHERE s.user_id IS NULL
  AND lower(COALESCE(s.email, '')) = lower(COALESCE(p.email, ''))
  AND COALESCE(s.email, '') <> '';

-- Replace recursive policies with security-definer checks.
DROP POLICY IF EXISTS "Participants can view joined deals" ON public.deals;
DROP POLICY IF EXISTS "Public can view active deals" ON public.deals;
DROP POLICY IF EXISTS "Suppliers delete own deals" ON public.deals;
DROP POLICY IF EXISTS "Suppliers insert own deals" ON public.deals;
DROP POLICY IF EXISTS "Suppliers update own deals" ON public.deals;
DROP POLICY IF EXISTS "Suppliers view own deals" ON public.deals;

CREATE POLICY "Public can view active deals"
ON public.deals
FOR SELECT
TO public
USING (
  status = 'active'
  AND COALESCE(is_deleted, false) = false
  AND EXISTS (
    SELECT 1
    FROM public.suppliers s
    WHERE s.id = deals.supplier_id
      AND s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status = ANY (ARRAY['approved'::text, 'active'::text])
  )
  AND (
    visibility_type = 'public'
    OR (
      visibility_type = 'project_only'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.project_id = deals.visibility_project_id
      )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_supplier_owner(deals.supplier_id, auth.uid())
  )
);

CREATE POLICY "Participants can view joined deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND public.user_participates_in_deal(deals.id::text, auth.uid())
);

CREATE POLICY "Suppliers view own deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_supplier_owner(deals.supplier_id, auth.uid()));

CREATE POLICY "Suppliers insert own deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.is_supplier_owner(deals.supplier_id, auth.uid()));

CREATE POLICY "Suppliers update own deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.is_supplier_owner(deals.supplier_id, auth.uid()))
WITH CHECK (public.is_supplier_owner(deals.supplier_id, auth.uid()));

CREATE POLICY "Suppliers delete own deals"
ON public.deals
FOR DELETE
TO authenticated
USING (public.is_supplier_owner(deals.supplier_id, auth.uid()));

DROP POLICY IF EXISTS "Suppliers view interests on own deals" ON public.deal_interests;
CREATE POLICY "Suppliers view interests on own deals"
ON public.deal_interests
FOR SELECT
TO authenticated
USING (public.is_supplier_for_deal(deal_interests.deal_id, auth.uid()));

DROP POLICY IF EXISTS "Suppliers view own voucher audit" ON public.voucher_audit_log;
CREATE POLICY "Suppliers view own voucher audit"
ON public.voucher_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vouchers v
    WHERE v.id = voucher_audit_log.voucher_id
      AND public.is_supplier_owner(v.supplier_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Suppliers update own vouchers status" ON public.vouchers;
DROP POLICY IF EXISTS "Suppliers view own vouchers" ON public.vouchers;
CREATE POLICY "Suppliers view own vouchers"
ON public.vouchers
FOR SELECT
TO authenticated
USING (public.is_supplier_owner(vouchers.supplier_id, auth.uid()));

CREATE POLICY "Suppliers update own vouchers status"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (public.is_supplier_owner(vouchers.supplier_id, auth.uid()))
WITH CHECK (public.is_supplier_owner(vouchers.supplier_id, auth.uid()));

-- Recreate missing triggers required for closing deals, voucher issuing and timestamps.
DROP TRIGGER IF EXISTS deal_interests_auto_close ON public.deal_interests;
CREATE TRIGGER deal_interests_auto_close
AFTER INSERT OR UPDATE OF lead_status, status, is_deleted
ON public.deal_interests
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_close_deal_from_interest();

DROP TRIGGER IF EXISTS deal_interests_notify ON public.deal_interests;
CREATE TRIGGER deal_interests_notify
AFTER INSERT
ON public.deal_interests
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_deal_interest();

DROP TRIGGER IF EXISTS deposits_enforce_integrity ON public.deposits;
CREATE TRIGGER deposits_enforce_integrity
BEFORE INSERT OR UPDATE
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.enforce_deposit_integrity();

DROP TRIGGER IF EXISTS deposits_auto_close ON public.deposits;
CREATE TRIGGER deposits_auto_close
AFTER INSERT OR UPDATE OF status
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_close_deal();

DROP TRIGGER IF EXISTS deposits_notify_change ON public.deposits;
CREATE TRIGGER deposits_notify_change
AFTER INSERT OR UPDATE OF status
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_deposit_change();

DROP TRIGGER IF EXISTS deposits_eval_conditional ON public.deposits;
CREATE TRIGGER deposits_eval_conditional
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_eval_conditional_on_deposit();

DROP TRIGGER IF EXISTS deposits_log_visibility ON public.deposits;
CREATE TRIGGER deposits_log_visibility
AFTER UPDATE OF is_hidden
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_log_deposit_visibility();

DROP TRIGGER IF EXISTS deals_validate_offer ON public.deals;
CREATE TRIGGER deals_validate_offer
BEFORE INSERT OR UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.validate_deal_offer();

DROP TRIGGER IF EXISTS deals_lock_closed_fields ON public.deals;
CREATE TRIGGER deals_lock_closed_fields
BEFORE UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.lock_closed_deal_fields();

DROP TRIGGER IF EXISTS deals_updated_at ON public.deals;
CREATE TRIGGER deals_updated_at
BEFORE UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Repair deals that already reached their target while triggers were missing.
WITH to_close AS (
  SELECT d.id::text AS id
  FROM public.deals d
  WHERE d.status = 'active'
    AND COALESCE(d.is_deleted, false) = false
    AND d.auto_closed_at IS NULL
    AND public.deal_effective_target(d.id::text) IS NOT NULL
    AND public.get_deal_paid_count(d.id::text) >= public.deal_effective_target(d.id::text)
)
UPDATE public.deals d
SET status = 'closed',
    auto_closed_at = now(),
    updated_at = now()
FROM to_close tc
WHERE d.id::text = tc.id;

SELECT public.issue_vouchers_for_deal(d.id::text)
FROM public.deals d
WHERE d.status = 'closed'
  AND d.auto_closed_at IS NOT NULL
  AND COALESCE(d.is_deleted, false) = false;