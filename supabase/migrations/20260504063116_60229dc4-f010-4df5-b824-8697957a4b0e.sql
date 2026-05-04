CREATE OR REPLACE FUNCTION public.approve_lead_and_deposit(_interest_id uuid, _lead_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_interest public.deal_interests%ROWTYPE;
  v_is_admin boolean;
  v_is_supplier boolean;
  v_pending_deposit public.deposits%ROWTYPE;
  v_paid_deposit public.deposits%ROWTYPE;
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

  SELECT * INTO v_pending_deposit
  FROM public.deposits
  WHERE user_id = v_interest.user_id
    AND deal_id = v_interest.deal_id
    AND COALESCE(is_deleted, false) = false
    AND status = 'pending'::deposit_status
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pending_deposit.id IS NOT NULL THEN
    PERFORM set_config('app.allow_supplier_deposit_approval', 'on', true);

    UPDATE public.deposits
    SET status = 'paid'::deposit_status,
        paid_at = COALESCE(paid_at, now())
    WHERE id = v_pending_deposit.id;
  ELSE
    SELECT * INTO v_paid_deposit
    FROM public.deposits
    WHERE user_id = v_interest.user_id
      AND deal_id = v_interest.deal_id
      AND COALESCE(is_deleted, false) = false
      AND status = 'paid'::deposit_status
    ORDER BY paid_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_paid_deposit.id IS NULL AND (
      v_interest.deposit_required
      OR v_interest.deposit_status IN ('pending', 'committed', 'pending_deposit')
      OR COALESCE(v_interest.deposit_amount, 0) > 0
    ) THEN
      RAISE EXCEPTION 'אין פיקדון ממתין לאישור';
    END IF;
  END IF;

  UPDATE public.deal_interests
  SET lead_status = 'approved',
      status = CASE WHEN deposit_required OR COALESCE(deposit_amount, 0) > 0 THEN 'paid' ELSE 'approved' END,
      deposit_status = CASE WHEN deposit_required OR COALESCE(deposit_amount, 0) > 0 THEN 'paid' ELSE deposit_status END,
      updated_at = now()
  WHERE id = v_interest.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_deposit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'פיקדון חדש בהמתנה',
      'סכום: ' || NEW.amount::text || ' ש״ח',
      'deposit',
      '/admin/deposits',
      jsonb_build_object('deposit_id', NEW.id, 'deal_id', NEW.deal_id)
    );
    PERFORM public.notify_user(
      NEW.user_id,
      'הפיקדון נרשם',
      'הפיקדון שלך התקבל וממתין לאישור.',
      'deposit',
      '/my-offers',
      jsonb_build_object('deposit_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status::text = 'paid' THEN
      UPDATE public.deal_interests
      SET deposit_status = 'paid',
          status = 'paid',
          lead_status = CASE WHEN lead_status IN ('new', 'pending') THEN 'approved' ELSE lead_status END,
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND deal_id = NEW.deal_id
        AND COALESCE(is_deleted, false) = false;

      PERFORM public.notify_user(
        NEW.user_id,
        'הפיקדון אושר',
        'הפיקדון שלך אושר וההצטרפות שלך להצעה הושלמה.',
        'deposit',
        '/my-offers',
        jsonb_build_object('deposit_id', NEW.id)
      );
    ELSIF NEW.status::text = 'refunded' THEN
      UPDATE public.deal_interests
      SET deposit_status = 'refunded',
          status = 'refunded',
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND deal_id = NEW.deal_id
        AND COALESCE(is_deleted, false) = false;

      PERFORM public.notify_user(
        NEW.user_id,
        'הפיקדון הוחזר',
        'הפיקדון שלך הוחזר.',
        'deposit',
        '/my-offers',
        jsonb_build_object('deposit_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_deposit_integrity ON public.deposits;
CREATE TRIGGER trg_enforce_deposit_integrity
BEFORE INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.enforce_deposit_integrity();

DROP TRIGGER IF EXISTS trg_notify_deposit_change ON public.deposits;
CREATE TRIGGER trg_notify_deposit_change
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deposit_change();

REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) TO authenticated;