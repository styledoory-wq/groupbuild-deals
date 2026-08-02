CREATE OR REPLACE FUNCTION public.guard_participation_fee_deposits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _claims jsonb;
  _role text;
  _kind text;
BEGIN
  _kind := COALESCE(NEW.payment_kind, CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_kind END);
  IF _kind IS DISTINCT FROM 'participation_fee' THEN
    RETURN NEW;
  END IF;

  -- Explicit, audited bypass used by admin_override_participation_payment().
  IF COALESCE(current_setting('app.allow_participation_write', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  BEGIN
    _claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    _claims := NULL;
  END;
  _role := _claims ->> 'role';

  -- No JWT context (service role / edge function / cron) → allowed.
  IF _claims IS NULL OR _role = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'participation_fee_client_write_forbidden';
END;
$function$;

DROP TRIGGER IF EXISTS guard_participation_fee_deposits_trg ON public.deposits;
CREATE TRIGGER guard_participation_fee_deposits_trg
BEFORE INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.guard_participation_fee_deposits();

-- Allow the audited admin override to pass the guard.
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

  PERFORM set_config('app.allow_participation_write', '1', true);

  UPDATE public.deposits
  SET status = 'paid', paid_at = now(), confirmed_by = auth.uid()
  WHERE id = _deposit_id;

  PERFORM set_config('app.allow_participation_write', '0', true);

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