-- Multiple catalogs per supplier
CREATE TABLE IF NOT EXISTS public.supplier_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size bigint,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_supplier
  ON public.supplier_catalogs(supplier_id, display_order);

ALTER TABLE public.supplier_catalogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view supplier catalogs" ON public.supplier_catalogs;
CREATE POLICY "Anyone can view supplier catalogs"
  ON public.supplier_catalogs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage supplier catalogs" ON public.supplier_catalogs;
CREATE POLICY "Admins manage supplier catalogs"
  ON public.supplier_catalogs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Suppliers manage own catalogs" ON public.supplier_catalogs;
CREATE POLICY "Suppliers manage own catalogs"
  ON public.supplier_catalogs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_catalogs.supplier_id
      AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_catalogs.supplier_id
      AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Suppliers manage catalogs by verified email" ON public.supplier_catalogs;
CREATE POLICY "Suppliers manage catalogs by verified email"
  ON public.supplier_catalogs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_catalogs.supplier_id
      AND lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_catalogs.supplier_id
      AND lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ));

DROP TRIGGER IF EXISTS trg_supplier_catalogs_updated_at ON public.supplier_catalogs;
CREATE TRIGGER trg_supplier_catalogs_updated_at
  BEFORE UPDATE ON public.supplier_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();