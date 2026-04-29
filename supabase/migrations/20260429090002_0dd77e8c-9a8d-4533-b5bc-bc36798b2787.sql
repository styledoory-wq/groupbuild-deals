CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas_on_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_supplier_service_areas(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_supplier_service_areas_supplier ON public.suppliers;
CREATE TRIGGER trg_refresh_supplier_service_areas_supplier
AFTER INSERT OR UPDATE OF serves_all_country ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_on_supplier();

REVOKE ALL ON FUNCTION public.refresh_supplier_service_areas_on_supplier() FROM PUBLIC, anon, authenticated;