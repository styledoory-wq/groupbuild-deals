CREATE TABLE IF NOT EXISTS public.admin_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('supplier','resident','committee','all')),
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_message_templates TO authenticated;
GRANT ALL ON public.admin_message_templates TO service_role;
ALTER TABLE public.admin_message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage templates" ON public.admin_message_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS admin_message_templates_audience_idx ON public.admin_message_templates(audience);