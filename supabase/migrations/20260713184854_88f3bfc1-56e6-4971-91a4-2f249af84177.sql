REVOKE ALL ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) TO service_role;