CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_is_admin boolean;
  v_supplier_can_approve boolean;
  v_allow_supplier_approval boolean;
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
    v_allow_supplier_approval := COALESCE(current_setting('app.allow_supplier_deposit_approval', true), '') = 'on';

    SELECT EXISTS (
      SELECT 1
      FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id::text = OLD.deal_id
        AND (
          s.user_id = auth.uid()
          OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    ) INTO v_supplier_can_approve;

    -- Non-admins cannot update deposits except through the controlled lead-approval function.
    IF NOT v_is_admin AND NOT (
      v_allow_supplier_approval
      AND v_supplier_can_approve
      AND NEW.id = OLD.id
      AND NEW.user_id = OLD.user_id
      AND NEW.deal_id = OLD.deal_id
      AND NEW.amount = OLD.amount
      AND NEW.currency = OLD.currency
      AND NEW.status = 'paid'::deposit_status
      AND OLD.status = 'pending'::deposit_status
      AND NEW.refunded_at IS NOT DISTINCT FROM OLD.refunded_at
      AND NEW.is_deleted IS NOT DISTINCT FROM OLD.is_deleted
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
    ) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.approve_lead_and_deposit(_interest_id uuid, _lead_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_is_admin boolean;
  v_is_supplier boolean;
  v_deposit public.deposits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _lead_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid lead status';
  END IF;

  SELECT * INTO v_interest
  FROM public.deal_interests
  WHERE id = _interest_id
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_interest.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id::text = v_interest.deal_id
      AND (
        s.user_id = auth.uid()
        OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  ) INTO v_is_supplier;

  IF NOT v_is_admin AND NOT v_is_supplier THEN
    RAISE EXCEPTION 'Not allowed to approve this lead';
  END IF;

  IF _lead_status = 'rejected' THEN
    UPDATE public.deal_interests
    SET lead_status = 'rejected',
        status = 'rejected',
        updated_at = now()
    WHERE id = v_interest.id;
    RETURN;
  END IF;

  IF v_interest.deposit_required THEN
    SELECT * INTO v_deposit
    FROM public.deposits
    WHERE user_id = v_interest.user_id
      AND deal_id = v_interest.deal_id
      AND COALESCE(is_deleted, false) = false
      AND status IN ('pending'::deposit_status, 'paid'::deposit_status)
    ORDER BY CASE WHEN status = 'paid'::deposit_status THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1;

    IF v_deposit.id IS NULL THEN
      RAISE EXCEPTION 'No related deposit found for this lead';
    END IF;

    IF v_deposit.status = 'pending'::deposit_status THEN
      PERFORM set_config('app.allow_supplier_deposit_approval', 'on', true);

      UPDATE public.deposits
      SET status = 'paid'::deposit_status,
          paid_at = COALESCE(paid_at, now())
      WHERE id = v_deposit.id;
    END IF;
  END IF;

  UPDATE public.deal_interests
  SET lead_status = 'approved',
      status = CASE WHEN deposit_required THEN 'paid' ELSE 'approved' END,
      deposit_status = CASE WHEN deposit_required THEN 'paid' ELSE deposit_status END,
      updated_at = now()
  WHERE id = v_interest.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) TO authenticated;