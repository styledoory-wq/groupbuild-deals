GRANT SELECT ON public.vouchers TO authenticated;
GRANT UPDATE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;

GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deal_effective_target(text) TO authenticated;