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

  IF COALESCE(current_setting('app.allow_participation_write', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND NEW.paid_at IS NOT DISTINCT FROM OLD.paid_at
     AND NEW.payment_kind IS NOT DISTINCT FROM OLD.payment_kind THEN
    RETURN NEW;
  END IF;

  -- Admins may reverse a payment (refund/cancel) but never create one.
  IF TG_OP = 'UPDATE'
     AND NEW.status IN ('refunded', 'cancelled')
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  BEGIN
    _claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    _claims := NULL;
  END;
  _role := _claims ->> 'role';

  IF _claims IS NULL OR _role = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'participation_fee_client_write_forbidden';
END;
$function$;