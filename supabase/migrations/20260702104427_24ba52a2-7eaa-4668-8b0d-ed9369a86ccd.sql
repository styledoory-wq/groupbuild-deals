
-- 1) Extend deals with area/targeting columns
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS serves_all_country boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_region_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- 2) deal_regions join table (work area — regions)
CREATE TABLE IF NOT EXISTS public.deal_regions (
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, region_id)
);
GRANT SELECT ON public.deal_regions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_regions TO authenticated;
GRANT ALL ON public.deal_regions TO service_role;
ALTER TABLE public.deal_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_regions readable by all"
  ON public.deal_regions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "deal_regions manageable by deal owner or admin"
  ON public.deal_regions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id = deal_regions.deal_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id = deal_regions.deal_id AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_deal_regions_deal ON public.deal_regions(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_regions_region ON public.deal_regions(region_id);

-- 3) deal_cities join table (work area — cities)
CREATE TABLE IF NOT EXISTS public.deal_cities (
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, city_id)
);
GRANT SELECT ON public.deal_cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_cities TO authenticated;
GRANT ALL ON public.deal_cities TO service_role;
ALTER TABLE public.deal_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_cities readable by all"
  ON public.deal_cities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "deal_cities manageable by deal owner or admin"
  ON public.deal_cities FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id = deal_cities.deal_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id = deal_cities.deal_id AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_deal_cities_deal ON public.deal_cities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_cities_city ON public.deal_cities(city_id);
