
CREATE TABLE IF NOT EXISTS public.supplier_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  user_id uuid NOT NULL,
  full_name text,
  phone text,
  email text,
  city text,
  project_name text,
  category_id text,
  message text,
  source text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'new',
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_supplier ON public.supplier_inquiries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_user ON public.supplier_inquiries(user_id);

ALTER TABLE public.supplier_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all supplier inquiries"
  ON public.supplier_inquiries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own supplier inquiries"
  ON public.supplier_inquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own supplier inquiries"
  ON public.supplier_inquiries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Suppliers view inquiries on own supplier"
  ON public.supplier_inquiries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_inquiries.supplier_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ));

CREATE POLICY "Suppliers update inquiries on own supplier"
  ON public.supplier_inquiries FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_inquiries.supplier_id
      AND (s.user_id = auth.uid()
           OR lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ));

CREATE TRIGGER update_supplier_inquiries_updated_at
  BEFORE UPDATE ON public.supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_notify_supplier_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_user uuid;
  v_business text;
BEGIN
  SELECT user_id, business_name INTO v_supplier_user, v_business
  FROM public.suppliers WHERE id = NEW.supplier_id LIMIT 1;

  IF v_supplier_user IS NOT NULL THEN
    PERFORM public.notify_user(
      v_supplier_user,
      'פנייה חדשה מדייר',
      COALESCE(NEW.full_name, 'דייר') || ' מתעניין בשירותים שלך',
      'lead',
      '/supplier/leads',
      jsonb_build_object('inquiry_id', NEW.id, 'supplier_id', NEW.supplier_id)
    );
  END IF;

  PERFORM public.notify_admins(
    'פנייה חדשה לספק',
    COALESCE(NEW.full_name, 'דייר') || ' פנה אל ' || COALESCE(v_business, 'ספק'),
    'lead',
    '/admin/leads',
    jsonb_build_object('inquiry_id', NEW.id, 'supplier_id', NEW.supplier_id)
  );

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_supplier_inquiry_notify
  AFTER INSERT ON public.supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_supplier_inquiry();
