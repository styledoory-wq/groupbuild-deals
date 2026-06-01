-- Extend notification_settings with per-channel toggles
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean NOT NULL DEFAULT false,
  -- Deposit confirmed
  ADD COLUMN IF NOT EXISTS deposit_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deposit_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deposit_sms_enabled boolean NOT NULL DEFAULT false,
  -- New lead (suppliers)
  ADD COLUMN IF NOT EXISTS new_lead_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_lead_sms_enabled boolean NOT NULL DEFAULT false,
  -- New supplier offer (residents)
  ADD COLUMN IF NOT EXISTS new_offer_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_offer_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_offer_sms_enabled boolean NOT NULL DEFAULT false,
  -- Voucher created
  ADD COLUMN IF NOT EXISTS voucher_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voucher_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voucher_sms_enabled boolean NOT NULL DEFAULT false,
  -- Deal status changed
  ADD COLUMN IF NOT EXISTS deal_status_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deal_status_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deal_status_sms_enabled boolean NOT NULL DEFAULT false,
  -- Approval push/sms (email already exists)
  ADD COLUMN IF NOT EXISTS approval_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_sms_enabled boolean NOT NULL DEFAULT false,
  -- System push/sms (email already exists)
  ADD COLUMN IF NOT EXISTS system_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS system_sms_enabled boolean NOT NULL DEFAULT false,
  -- Welcome
  ADD COLUMN IF NOT EXISTS welcome_email_enabled boolean NOT NULL DEFAULT true;

-- Device tokens for push notifications
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  device_info jsonb,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);

CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();