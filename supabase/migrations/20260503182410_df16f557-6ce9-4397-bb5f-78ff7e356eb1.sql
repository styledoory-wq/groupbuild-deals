
-- =========================================================
-- 1. RLS hardening on deposits
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users insert own deposits" ON public.deposits;

-- Users: SELECT own only
CREATE POLICY "deposits_select_own"
ON public.deposits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users: INSERT only their own row (amount/status still validated by trigger below)
CREATE POLICY "deposits_insert_own"
ON public.deposits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins: full SELECT
CREATE POLICY "deposits_admin_select"
ON public.deposits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins: UPDATE (only role allowed to change status / payment fields)
CREATE POLICY "deposits_admin_update"
ON public.deposits FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins: DELETE (soft-delete still preferred but allow hard delete for cleanup)
CREATE POLICY "deposits_admin_delete"
ON public.deposits FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins: INSERT (for admin-created deposits, e.g. manual reconciliation)
CREATE POLICY "deposits_admin_insert"
ON public.deposits FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 2. Server-side integrity trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    -- user_id must equal caller (unless admin)
    IF NOT v_is_admin AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot create deposit for another user';
    END IF;

    -- Deal must exist, be active, not deleted
    SELECT id, status, is_deleted, deposit_amount, deposit_required
    INTO v_deal
    FROM public.deals
    WHERE id::text = NEW.deal_id
    LIMIT 1;

    IF v_deal.id IS NULL THEN
      RAISE EXCEPTION 'Deal not found: %', NEW.deal_id;
    END IF;
    IF COALESCE(v_deal.is_deleted, false) THEN
      RAISE EXCEPTION 'Deal is deleted';
    END IF;
    IF v_deal.status <> 'active' THEN
      RAISE EXCEPTION 'Deal is not active';
    END IF;

    -- Force amount from deal (clients cannot override). Admins may override.
    IF NOT v_is_admin THEN
      NEW.amount := COALESCE(v_deal.deposit_amount, 0);
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Deal has no valid deposit amount';
      END IF;

      -- Force safe defaults — clients cannot pre-mark paid
      NEW.status := 'pending'::deposit_status;
      NEW.paid_at := NULL;
      NEW.refunded_at := NULL;
      NEW.provider_transaction_id := NULL;
      NEW.provider_payment_url := NULL;
      NEW.is_deleted := false;
      NEW.deleted_at := NULL;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admins cannot update deposits at all (RLS already blocks, defense in depth)
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can update deposits';
    END IF;
    -- Auto-stamp paid_at / refunded_at on status transitions if not set
    IF NEW.status = 'paid'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.status = 'refunded'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.refunded_at IS NULL THEN
      NEW.refunded_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_deposit_integrity ON public.deposits;
CREATE TRIGGER trg_enforce_deposit_integrity
BEFORE INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.enforce_deposit_integrity();

-- =========================================================
-- 3. Prevent duplicate active deposits
-- =========================================================
-- One active (pending/paid) non-deleted deposit per (user, deal)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_deposit_per_user_deal
ON public.deposits (user_id, deal_id)
WHERE status IN ('pending'::deposit_status, 'paid'::deposit_status)
  AND COALESCE(is_deleted, false) = false;

-- =========================================================
-- 4. Failed-attempt logging
-- =========================================================
CREATE TABLE IF NOT EXISTS public.deposit_attempt_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  deal_id text,
  attempted_amount numeric,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_attempt_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view deposit attempt logs" ON public.deposit_attempt_logs;
CREATE POLICY "Admins view deposit attempt logs"
ON public.deposit_attempt_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can log own attempt" ON public.deposit_attempt_logs;
CREATE POLICY "Authenticated can log own attempt"
ON public.deposit_attempt_logs FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- =========================================================
-- 5. Re-attach notification triggers (functions exist but no triggers)
-- =========================================================
DROP TRIGGER IF EXISTS trg_notify_deposit_change ON public.deposits;
CREATE TRIGGER trg_notify_deposit_change
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deposit_change();

DROP TRIGGER IF EXISTS trg_notify_deal_interest ON public.deal_interests;
CREATE TRIGGER trg_notify_deal_interest
AFTER INSERT ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deal_interest();

DROP TRIGGER IF EXISTS trg_notify_new_supplier ON public.suppliers;
CREATE TRIGGER trg_notify_new_supplier
AFTER INSERT ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_supplier();

DROP TRIGGER IF EXISTS trg_notify_new_waitlist ON public.waitlist_leads;
CREATE TRIGGER trg_notify_new_waitlist
AFTER INSERT ON public.waitlist_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_waitlist();

-- =========================================================
-- 6. Lock down RPC: ensure get_deal_paid_count is read-only and stable
-- (already STABLE SECURITY DEFINER; revoke from public, grant to anon/authenticated)
-- =========================================================
REVOKE ALL ON FUNCTION public.get_deal_paid_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO anon, authenticated;
