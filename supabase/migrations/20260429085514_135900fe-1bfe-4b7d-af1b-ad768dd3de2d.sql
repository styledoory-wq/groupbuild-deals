ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_suppliers_service_areas
ON public.suppliers USING gin (service_areas);

CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas(_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    WHEN COALESCE(serves_all, false) OR COALESCE(array_length(area_names, 1), 0) = 0 THEN ARRAY['כל הארץ']::text[]
    ELSE area_names
  END
  WHERE id = _supplier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  sid := COALESCE(NEW.supplier_id, OLD.supplier_id);
  PERFORM public.refresh_supplier_service_areas(sid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas_on_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.serves_all_country IS DISTINCT FROM OLD.serves_all_country THEN
    PERFORM public.refresh_supplier_service_areas(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_supplier_service_areas_regions ON public.supplier_regions;
CREATE TRIGGER trg_refresh_supplier_service_areas_regions
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_regions
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

DROP TRIGGER IF EXISTS trg_refresh_supplier_service_areas_cities ON public.supplier_cities;
CREATE TRIGGER trg_refresh_supplier_service_areas_cities
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_cities
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

DROP TRIGGER IF EXISTS trg_refresh_supplier_service_areas_supplier ON public.suppliers;
CREATE TRIGGER trg_refresh_supplier_service_areas_supplier
AFTER UPDATE OF serves_all_country ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_on_supplier();

DO $$
DECLARE
  s record;
BEGIN
  FOR s IN SELECT id FROM public.suppliers LOOP
    PERFORM public.refresh_supplier_service_areas(s.id);
  END LOOP;
END $$;