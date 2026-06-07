REVOKE EXECUTE ON FUNCTION public.get_deal_paid_count(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deal_effective_target(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deal_effective_target(text) TO authenticated, service_role;