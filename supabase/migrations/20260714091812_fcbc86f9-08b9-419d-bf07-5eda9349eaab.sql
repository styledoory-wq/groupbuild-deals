
CREATE TABLE IF NOT EXISTS public.category_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_history_cat ON public.category_history(category_id, created_at DESC);

GRANT SELECT, INSERT ON public.category_history TO authenticated;
GRANT ALL ON public.category_history TO service_role;

ALTER TABLE public.category_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view history" ON public.category_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert history" ON public.category_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
