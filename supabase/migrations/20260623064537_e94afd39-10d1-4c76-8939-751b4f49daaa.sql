ALTER TYPE public.payment_provider_enum ADD VALUE IF NOT EXISTS 'manual';
ALTER TYPE public.deposit_status ADD VALUE IF NOT EXISTS 'awaiting_confirmation';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS bit_phone TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions_note TEXT;

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS declared_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declared_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

UPDATE public.deposits d
SET supplier_id = de.supplier_id
FROM public.deals de
WHERE d.deal_id = de.id::text AND d.supplier_id IS NULL;

DROP POLICY IF EXISTS "Suppliers can view own deal deposits" ON public.deposits;
CREATE POLICY "Suppliers can view own deal deposits" ON public.deposits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = deposits.supplier_id AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.declare_deposit_paid(_deposit_id UUID, _method TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deposits
  SET status = 'awaiting_confirmation',
      declared_paid_at = now(),
      declared_payment_method = _method
  WHERE id = _deposit_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found_or_not_pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_deposit_received(_deposit_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_supplier BOOLEAN;
  _is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.deposits d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = _deposit_id AND s.user_id = auth.uid()
  ) INTO _is_supplier;
  SELECT public.has_role(auth.uid(), 'admin') INTO _is_admin;
  IF NOT (_is_supplier OR _is_admin) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.deposits
  SET status = 'paid', paid_at = now(), confirmed_by = auth.uid()
  WHERE id = _deposit_id AND status IN ('awaiting_confirmation', 'pending');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found_or_invalid_state';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.declare_deposit_paid(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_deposit_received(UUID) TO authenticated;