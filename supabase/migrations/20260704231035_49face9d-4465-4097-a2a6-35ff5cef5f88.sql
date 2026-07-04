REVOKE ALL ON FUNCTION public.ensure_user_project() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_project() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_project() TO authenticated;