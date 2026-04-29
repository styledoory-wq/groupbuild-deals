CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  area_names text[];
  serves_all boolean;
BEGIN
  SELECT serves_all_country INTO serves_all
  FROM public.suppliers
  WHERE id = _supplier_id;

  SELECT COALESCE(array_agg(DISTINCT name ORDER BY name), '{}') INTO area_names
  FROM (
    SELECT r.name_he AS name
    FROM public.supplier_regions sr
    JOIN public.regions r ON r.id = sr.region_id
    WHERE sr.supplier_id = _supplier_id
    UNION
    SELECT c.name_he AS name
    FROM public.supplier_cities sc
    JOIN public.cities c ON c.id = sc.city_id
    WHERE sc.supplier_id = _supplier_id
  ) areas;

  UPDATE public.suppliers
  SET service_areas = CASE
    WHEN COALESCE(serves_all, false) THEN ARRAY['כל הארץ']::text[]
    ELSE area_names
  END
  WHERE id = _supplier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_supplier_regions_service_areas_insupd ON public.supplier_regions;
DROP TRIGGER IF EXISTS refresh_supplier_regions_service_areas_del ON public.supplier_regions;
DROP TRIGGER IF EXISTS refresh_supplier_cities_service_areas_insupd ON public.supplier_cities;
DROP TRIGGER IF EXISTS refresh_supplier_cities_service_areas_del ON public.supplier_cities;
DROP TRIGGER IF EXISTS refresh_suppliers_service_areas_on_supplier ON public.suppliers;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;

CREATE TRIGGER refresh_supplier_regions_service_areas_insupd
AFTER INSERT OR UPDATE ON public.supplier_regions
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

CREATE TRIGGER refresh_supplier_regions_service_areas_del
AFTER DELETE ON public.supplier_regions
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

CREATE TRIGGER refresh_supplier_cities_service_areas_insupd
AFTER INSERT OR UPDATE ON public.supplier_cities
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

CREATE TRIGGER refresh_supplier_cities_service_areas_del
AFTER DELETE ON public.supplier_cities
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

CREATE TRIGGER refresh_suppliers_service_areas_on_supplier
AFTER INSERT OR UPDATE OF serves_all_country ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_on_supplier();

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Suppliers view records matching verified email"
ON public.suppliers
FOR SELECT
TO authenticated
USING (lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Suppliers update records matching verified email"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Suppliers manage regions by verified email"
ON public.supplier_regions
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_regions.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_regions.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
));

CREATE POLICY "Suppliers manage cities by verified email"
ON public.supplier_cities
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_cities.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_cities.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
));

CREATE POLICY "Suppliers manage gallery by verified email"
ON public.supplier_gallery
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_gallery.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = supplier_gallery.supplier_id
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
));

SELECT public.refresh_supplier_service_areas(id) FROM public.suppliers;