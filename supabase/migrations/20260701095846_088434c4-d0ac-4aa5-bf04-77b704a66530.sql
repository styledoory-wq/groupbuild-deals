
-- 1) Dispatch log table
CREATE TABLE IF NOT EXISTS public.notification_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  push_status text,
  push_sent_at timestamptz,
  push_error text,
  email_status text,
  email_sent_at timestamptz,
  email_error text,
  dispatch_status text NOT NULL DEFAULT 'pending',
  dispatch_error text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_dispatch_log_notification_id_key UNIQUE (notification_id)
);

CREATE INDEX IF NOT EXISTS idx_ndl_user_type_created
  ON public.notification_dispatch_log (user_id, notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ndl_status
  ON public.notification_dispatch_log (dispatch_status, created_at DESC);

GRANT SELECT ON public.notification_dispatch_log TO authenticated;
GRANT ALL ON public.notification_dispatch_log TO service_role;

ALTER TABLE public.notification_dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view dispatch log" ON public.notification_dispatch_log;
CREATE POLICY "Admins can view dispatch log"
  ON public.notification_dispatch_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_ndl_updated_at ON public.notification_dispatch_log;
CREATE TRIGGER trg_ndl_updated_at BEFORE UPDATE ON public.notification_dispatch_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trigger: on demand_invitation notification insert, invoke dispatch-notification via pg_net
CREATE OR REPLACE FUNCTION public.trg_dispatch_notification_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service_key text;
BEGIN
  IF NEW.type <> 'demand_invitation' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
     WHERE name = 'email_queue_service_role_key'
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'dispatch-notification: service key not available in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://jelgyosxolwngdiykswr.supabase.co/functions/v1/dispatch-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch-notification trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_dispatch ON public.notifications;
CREATE TRIGGER trg_notifications_dispatch
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_notification_after_insert();
