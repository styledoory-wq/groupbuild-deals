CREATE POLICY "Public can read supplier_regions"
  ON public.supplier_regions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read supplier_cities"
  ON public.supplier_cities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read regions"
  ON public.regions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read cities"
  ON public.cities FOR SELECT
  TO anon
  USING (true);