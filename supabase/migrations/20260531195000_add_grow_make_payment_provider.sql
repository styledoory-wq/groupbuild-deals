ALTER TYPE public.payment_provider_enum ADD VALUE IF NOT EXISTS 'grow_make';

ALTER TABLE public.system_settings
  ALTER COLUMN active_payment_provider SET DEFAULT 'grow_make';
