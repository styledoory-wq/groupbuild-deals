GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT ON public.suppliers TO anon;
GRANT ALL ON public.suppliers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_regions TO authenticated;
GRANT SELECT ON public.supplier_regions TO anon;
GRANT ALL ON public.supplier_regions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_cities TO authenticated;
GRANT SELECT ON public.supplier_cities TO anon;
GRANT ALL ON public.supplier_cities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_categories TO authenticated;
GRANT SELECT ON public.supplier_categories TO anon;
GRANT ALL ON public.supplier_categories TO service_role;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;