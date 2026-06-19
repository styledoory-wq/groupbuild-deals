
CREATE TABLE IF NOT EXISTS public.deal_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  user_id uuid NOT NULL,
  reminder_kind text NOT NULL,
  deadline_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, user_id, reminder_kind, deadline_date)
);

GRANT SELECT ON public.deal_reminder_log TO authenticated;
GRANT ALL ON public.deal_reminder_log TO service_role;

ALTER TABLE public.deal_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages reminder log"
  ON public.deal_reminder_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_deal_reminder_log_lookup
  ON public.deal_reminder_log (deal_id, user_id, reminder_kind, deadline_date);
