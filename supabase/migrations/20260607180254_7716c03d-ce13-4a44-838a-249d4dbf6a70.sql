REVOKE ALL ON public.vouchers FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;