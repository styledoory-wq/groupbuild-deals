DROP POLICY IF EXISTS "Anyone authenticated can view active suppliers" ON public.suppliers;

CREATE POLICY "Public can view approved active suppliers"
ON public.suppliers
FOR SELECT
TO public
USING (
  (is_active = true AND approval_status IN ('approved', 'active'))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);