-- Section 2: Hide deposits from view (no hard delete)
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS hidden_by uuid;

-- Audit trail for hide/unhide actions
CREATE TABLE IF NOT EXISTS public.deposit_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view deposit audit" ON public.deposit_audit_log;
CREATE POLICY "Admins view deposit audit" ON public.deposit_audit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own deposit audit" ON public.deposit_audit_log;
CREATE POLICY "Users view own deposit audit" ON public.deposit_audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated insert audit" ON public.deposit_audit_log;
CREATE POLICY "Authenticated insert audit" ON public.deposit_audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Update enforce_deposit_integrity to allow owner OR admin to toggle is_hidden
CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_is_admin boolean;
  v_is_owner boolean;
  v_supplier_can_approve boolean;
  v_allow_supplier_approval boolean;
  v_only_visibility_change boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot create deposit for another user';
    END IF;

    SELECT id, status, is_deleted, deposit_amount, deposit_required
    INTO v_deal FROM public.deals WHERE id::text = NEW.deal_id LIMIT 1;

    IF v_deal.id IS NULL THEN RAISE EXCEPTION 'Deal not found: %', NEW.deal_id; END IF;
    IF COALESCE(v_deal.is_deleted, false) THEN RAISE EXCEPTION 'Deal is deleted'; END IF;
    IF v_deal.status <> 'active' THEN RAISE EXCEPTION 'Deal is not active'; END IF;

    IF NOT v_is_admin THEN
      NEW.amount := COALESCE(v_deal.deposit_amount, 0);
      IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Deal has no valid deposit amount'; END IF;
      NEW.status := 'pending'::deposit_status;
      NEW.paid_at := NULL;
      NEW.refunded_at := NULL;
      NEW.provider_transaction_id := NULL;
      NEW.provider_payment_url := NULL;
      NEW.is_deleted := false;
      NEW.deleted_at := NULL;
      NEW.is_hidden := false;
      NEW.hidden_at := NULL;
      NEW.hidden_by := NULL;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_allow_supplier_approval := COALESCE(current_setting('app.allow_supplier_deposit_approval', true), '') = 'on';
    v_is_owner := OLD.user_id = auth.uid();

    -- Check: only is_hidden / hidden_at / hidden_by changed
    v_only_visibility_change :=
      NEW.id = OLD.id
      AND NEW.user_id = OLD.user_id
      AND NEW.deal_id = OLD.deal_id
      AND NEW.amount = OLD.amount
      AND NEW.currency = OLD.currency
      AND NEW.status = OLD.status
      AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at
      AND NEW.refunded_at IS NOT DISTINCT FROM OLD.refunded_at
      AND NEW.is_deleted IS NOT DISTINCT FROM OLD.is_deleted
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
      AND NEW.provider_transaction_id IS NOT DISTINCT FROM OLD.provider_transaction_id
      AND NEW.provider_payment_url IS NOT DISTINCT FROM OLD.provider_payment_url
      AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata;

    SELECT EXISTS (
      SELECT 1 FROM public.deals d JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id::text = OLD.deal_id
        AND (s.user_id = auth.uid() OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    ) INTO v_supplier_can_approve;

    IF NOT v_is_admin
       AND NOT (v_is_owner AND v_only_visibility_change)
       AND NOT (
         v_allow_supplier_approval AND v_supplier_can_approve
         AND NEW.id = OLD.id AND NEW.user_id = OLD.user_id AND NEW.deal_id = OLD.deal_id
         AND NEW.amount = OLD.amount AND NEW.currency = OLD.currency
         AND NEW.status = 'paid'::deposit_status AND OLD.status = 'pending'::deposit_status
         AND NEW.refunded_at IS NOT DISTINCT FROM OLD.refunded_at
         AND NEW.is_deleted IS NOT DISTINCT FROM OLD.is_deleted
         AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
       ) THEN
      RAISE EXCEPTION 'Only admins can update deposits';
    END IF;

    IF NEW.status = 'paid'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.status = 'refunded'::deposit_status AND OLD.status IS DISTINCT FROM NEW.status AND NEW.refunded_at IS NULL THEN
      NEW.refunded_at := now();
    END IF;
    IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden THEN
      IF NEW.is_hidden THEN
        NEW.hidden_at := COALESCE(NEW.hidden_at, now());
        NEW.hidden_by := COALESCE(NEW.hidden_by, auth.uid());
      ELSE
        NEW.hidden_at := NULL;
        NEW.hidden_by := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger to log hide/unhide
CREATE OR REPLACE FUNCTION public.trg_log_deposit_visibility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden THEN
    INSERT INTO public.deposit_audit_log (deposit_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(),
      CASE WHEN NEW.is_hidden THEN 'hidden' ELSE 'unhidden' END,
      jsonb_build_object('previous', OLD.is_hidden, 'new', NEW.is_hidden));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS log_deposit_visibility ON public.deposits;
CREATE TRIGGER log_deposit_visibility
AFTER UPDATE OF is_hidden ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_log_deposit_visibility();

-- Section 7: Supplier billing/commission fields
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS monthly_subscription numeric NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS billing_notes text;