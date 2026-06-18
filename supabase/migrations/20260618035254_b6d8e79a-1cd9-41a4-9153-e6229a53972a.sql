
CREATE TABLE public.committee_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  category_id UUID NULL,
  supplier_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  residents_count INTEGER NOT NULL CHECK (residents_count > 0),
  target_price_per_unit NUMERIC NULL CHECK (target_price_per_unit IS NULL OR target_price_per_unit >= 0),
  deadline TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_quote_requests TO authenticated;
GRANT ALL ON public.committee_quote_requests TO service_role;

ALTER TABLE public.committee_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committee can create requests for their project"
  ON public.committee_quote_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_committee_for_project(project_id, auth.uid())
  );

CREATE POLICY "Committee can view own requests"
  ON public.committee_quote_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Committee can update own open requests"
  ON public.committee_quote_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'open')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all quote requests"
  ON public.committee_quote_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Suppliers view requests addressed to them"
  ON public.committee_quote_requests FOR SELECT TO authenticated
  USING (
    supplier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = committee_quote_requests.supplier_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_committee_quote_requests_updated
  BEFORE UPDATE ON public.committee_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_notify_committee_quote_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_user UUID;
  v_project_name TEXT;
BEGIN
  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id LIMIT 1;

  PERFORM public.notify_admins(
    'בקשת הצעת מחיר חדשה מוועד בית',
    COALESCE(v_project_name, 'בניין') || ' — ' || NEW.title || ' (' || NEW.residents_count::text || ' דיירים)',
    'lead',
    '/admin/leads',
    jsonb_build_object('quote_request_id', NEW.id, 'project_id', NEW.project_id)
  );

  IF NEW.supplier_id IS NOT NULL THEN
    SELECT user_id INTO v_supplier_user FROM public.suppliers WHERE id = NEW.supplier_id LIMIT 1;
    IF v_supplier_user IS NOT NULL THEN
      PERFORM public.notify_user(
        v_supplier_user,
        'בקשת הצעת מחיר קבוצתית',
        'ועד בית פנה אליך עבור ' || NEW.residents_count::text || ' דיירים: ' || NEW.title,
        'lead',
        '/supplier/leads',
        jsonb_build_object('quote_request_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_committee_quote_requests_notify
  AFTER INSERT ON public.committee_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_committee_quote_request();
