REVOKE ALL ON FUNCTION public.refresh_supplier_service_areas(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_supplier_service_areas_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_supplier_service_areas_on_supplier() FROM PUBLIC, anon, authenticated;