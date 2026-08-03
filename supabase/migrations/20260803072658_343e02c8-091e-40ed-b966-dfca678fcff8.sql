ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS app_profile TEXT NOT NULL DEFAULT 'web';

ALTER TABLE public.device_tokens
  DROP CONSTRAINT IF EXISTS device_tokens_app_profile_check;

ALTER TABLE public.device_tokens
  ADD CONSTRAINT device_tokens_app_profile_check
  CHECK (app_profile IN ('residents', 'suppliers', 'web'));

CREATE INDEX IF NOT EXISTS device_tokens_app_profile_idx
  ON public.device_tokens (user_id, app_profile);