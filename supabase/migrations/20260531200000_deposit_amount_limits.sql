ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS deposit_min_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_max_amount numeric;

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_deposit_min_amount_check,
  ADD CONSTRAINT system_settings_deposit_min_amount_check
    CHECK (deposit_min_amount IS NULL OR deposit_min_amount > 0);

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_deposit_max_amount_check,
  ADD CONSTRAINT system_settings_deposit_max_amount_check
    CHECK (deposit_max_amount IS NULL OR deposit_max_amount > 0);

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_deposit_min_max_check,
  ADD CONSTRAINT system_settings_deposit_min_max_check
    CHECK (
      deposit_min_amount IS NULL
      OR deposit_max_amount IS NULL
      OR deposit_min_amount <= deposit_max_amount
    );

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_deposit_amount_valid_check,
  ADD CONSTRAINT deals_deposit_amount_valid_check
    CHECK (
      deposit_required = false
      OR (
        deposit_amount > 0
        AND deposit_amount = round(deposit_amount, 2)
      )
    );

ALTER TABLE public.deal_interests
  DROP CONSTRAINT IF EXISTS deal_interests_deposit_amount_valid_check,
  ADD CONSTRAINT deal_interests_deposit_amount_valid_check
    CHECK (
      deposit_required = false
      OR (
        deposit_amount > 0
        AND deposit_amount = round(deposit_amount, 2)
      )
    );
