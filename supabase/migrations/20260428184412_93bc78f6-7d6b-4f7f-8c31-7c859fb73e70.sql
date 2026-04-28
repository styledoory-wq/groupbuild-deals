-- 1. Profiles: add admin-managed fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

-- 2. admin_settings - single-row config for notification emails etc.
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_email text,
  notify_on_new_resident boolean NOT NULL DEFAULT true,
  notify_on_new_supplier boolean NOT NULL DEFAULT true,
  notify_on_deal_interest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings table"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read admin settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.admin_settings (id) VALUES (gen_random_uuid())
  ON CONFLICT DO NOTHING;

CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. deal_interests - users expressing interest before paying deposit
CREATE TABLE IF NOT EXISTS public.deal_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id text NOT NULL,
  status text NOT NULL DEFAULT 'interested',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deal_id)
);
ALTER TABLE public.deal_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own interests"
  ON public.deal_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own interests"
  ON public.deal_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own interests"
  ON public.deal_interests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all interests"
  ON public.deal_interests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER deal_interests_updated_at
  BEFORE UPDATE ON public.deal_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_deal_interests_user ON public.deal_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_interests_deal ON public.deal_interests(deal_id);