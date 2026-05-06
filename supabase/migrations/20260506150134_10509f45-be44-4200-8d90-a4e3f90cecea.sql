-- Allow suppliers to manage their own deals also when matched by verified email
CREATE POLICY "Suppliers update deals by verified email"
ON public.deals
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = deals.supplier_id
    AND lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = deals.supplier_id
    AND lower(COALESCE(s.email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
));