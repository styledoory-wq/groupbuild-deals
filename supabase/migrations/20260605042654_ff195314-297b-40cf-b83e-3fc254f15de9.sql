GRANT SELECT ON public.supplier_cities TO authenticated;
GRANT SELECT ON public.supplier_regions TO authenticated;
GRANT SELECT ON public.supplier_councils TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplier_cities'
      AND policyname = 'Authenticated can read supplier_cities'
  ) THEN
    CREATE POLICY "Authenticated can read supplier_cities"
    ON public.supplier_cities
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplier_regions'
      AND policyname = 'Authenticated can read supplier_regions'
  ) THEN
    CREATE POLICY "Authenticated can read supplier_regions"
    ON public.supplier_regions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplier_councils'
      AND policyname = 'Authenticated can read supplier_councils'
  ) THEN
    CREATE POLICY "Authenticated can read supplier_councils"
    ON public.supplier_councils
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;