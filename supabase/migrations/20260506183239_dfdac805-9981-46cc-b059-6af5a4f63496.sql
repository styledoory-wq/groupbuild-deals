
-- Notification settings per user
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  approval_email_enabled boolean NOT NULL DEFAULT true,
  new_lead_email_enabled boolean NOT NULL DEFAULT true,
  system_email_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notification settings" ON public.notification_settings;
CREATE POLICY "Users view own notification settings"
  ON public.notification_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notification settings" ON public.notification_settings;
CREATE POLICY "Users insert own notification settings"
  ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification settings" ON public.notification_settings;
CREATE POLICY "Users update own notification settings"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage notification settings" ON public.notification_settings;
CREATE POLICY "Admins manage notification settings"
  ON public.notification_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create default settings on profile creation
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_notification_settings ON public.profiles;
CREATE TRIGGER trg_create_notification_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_settings();

-- Backfill existing users
INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Outgoing email audit log
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  email_type text NOT NULL,
  subject text NOT NULL,
  body_preview text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view email outbox" ON public.email_outbox;
CREATE POLICY "Admins view email outbox"
  ON public.email_outbox FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
