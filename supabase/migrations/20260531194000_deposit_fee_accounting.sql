ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS payment_fee_absorber text NOT NULL DEFAULT 'groupbuild';

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_payment_fee_absorber_check,
  ADD CONSTRAINT system_settings_payment_fee_absorber_check
    CHECK (payment_fee_absorber IN ('resident', 'supplier', 'groupbuild'));

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS gross_deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_processing_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_processing_fee_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS net_deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_fee_absorber text NOT NULL DEFAULT 'groupbuild',
  ADD COLUMN IF NOT EXISTS supplier_deduction_basis text NOT NULL DEFAULT 'net',
  ADD COLUMN IF NOT EXISTS supplier_deduction_amount numeric;

UPDATE public.deposits
SET gross_deposit_amount = COALESCE(gross_deposit_amount, amount),
    net_deposit_amount = COALESCE(net_deposit_amount, amount),
    supplier_deduction_amount = COALESCE(supplier_deduction_amount, amount)
WHERE gross_deposit_amount IS NULL
   OR net_deposit_amount IS NULL
   OR supplier_deduction_amount IS NULL;

ALTER TABLE public.deposits
  ALTER COLUMN gross_deposit_amount SET NOT NULL,
  ALTER COLUMN net_deposit_amount SET NOT NULL,
  ALTER COLUMN supplier_deduction_amount SET NOT NULL;

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_payment_processing_fee_status_check,
  ADD CONSTRAINT deposits_payment_processing_fee_status_check
    CHECK (payment_processing_fee_status IN ('unknown', 'pending', 'estimated', 'final'));

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_payment_fee_absorber_check,
  ADD CONSTRAINT deposits_payment_fee_absorber_check
    CHECK (payment_fee_absorber IN ('resident', 'supplier', 'groupbuild'));

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_supplier_deduction_basis_check,
  ADD CONSTRAINT deposits_supplier_deduction_basis_check
    CHECK (supplier_deduction_basis IN ('net', 'gross'));

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_fee_amount_nonnegative_check,
  ADD CONSTRAINT deposits_fee_amount_nonnegative_check
    CHECK (payment_processing_fee_amount IS NULL OR payment_processing_fee_amount >= 0);

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_gross_net_nonnegative_check,
  ADD CONSTRAINT deposits_gross_net_nonnegative_check
    CHECK (gross_deposit_amount >= 0 AND net_deposit_amount >= 0 AND supplier_deduction_amount >= 0);

CREATE OR REPLACE FUNCTION public.enforce_deposit_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_settings RECORD;
  v_is_admin boolean;
  v_fee numeric;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  SELECT payment_fee_absorber
  INTO v_settings
  FROM public.system_settings
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot create deposit for another user';
    END IF;

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

    IF NOT v_is_admin THEN
      NEW.amount := COALESCE(v_deal.deposit_amount, 0);
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Deal has no valid deposit amount';
      END IF;

      NEW.status := 'pending'::deposit_status;
      NEW.paid_at := NULL;
      NEW.refunded_at := NULL;
      NEW.provider_transaction_id := NULL;
      NEW.provider_payment_url := NULL;
      NEW.is_deleted := false;
      NEW.deleted_at := NULL;
    END IF;

    NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    NEW.supplier_deduction_basis := CASE
      WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross'
      ELSE 'net'
    END;

    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(NEW.gross_deposit_amount - v_fee, 0);
    NEW.supplier_deduction_amount := CASE
      WHEN NEW.supplier_deduction_basis = 'gross' THEN NEW.gross_deposit_amount
      ELSE NEW.net_deposit_amount
    END;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can update deposits';
    END IF;

    NEW.gross_deposit_amount := COALESCE(NEW.gross_deposit_amount, NEW.amount);
    NEW.payment_processing_fee_status := COALESCE(NEW.payment_processing_fee_status, OLD.payment_processing_fee_status, 'unknown');
    NEW.payment_fee_absorber := COALESCE(NEW.payment_fee_absorber, OLD.payment_fee_absorber, v_settings.payment_fee_absorber, 'groupbuild');
    NEW.supplier_deduction_basis := CASE
      WHEN NEW.payment_fee_absorber = 'groupbuild' THEN 'gross'
      ELSE 'net'
    END;
    v_fee := COALESCE(NEW.payment_processing_fee_amount, 0);
    NEW.net_deposit_amount := GREATEST(NEW.gross_deposit_amount - v_fee, 0);
    NEW.supplier_deduction_amount := CASE
      WHEN NEW.supplier_deduction_basis = 'gross' THEN NEW.gross_deposit_amount
      ELSE NEW.net_deposit_amount
    END;

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
