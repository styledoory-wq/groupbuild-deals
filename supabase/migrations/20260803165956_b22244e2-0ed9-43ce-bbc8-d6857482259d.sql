ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_error_code text,
  ADD COLUMN IF NOT EXISTS refund_error_description text,
  ADD COLUMN IF NOT EXISTS refund_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_refund_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_refund_id text,
  ADD COLUMN IF NOT EXISTS join_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_email_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.deposits'::regclass AND conname = 'deposits_refund_status_check'
  ) THEN
    ALTER TABLE public.deposits
      ADD CONSTRAINT deposits_refund_status_check
      CHECK (refund_status IS NULL OR refund_status = ANY (ARRAY['pending','processing','refunded','failed']));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deposits_refund_status
  ON public.deposits (refund_status)
  WHERE refund_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deposits_deal_paid_participation
  ON public.deposits (deal_id)
  WHERE payment_kind = 'participation_fee';