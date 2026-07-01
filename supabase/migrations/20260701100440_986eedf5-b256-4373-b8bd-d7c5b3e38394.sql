
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS demand_invitation_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS demand_invitation_email_enabled boolean NOT NULL DEFAULT true;
