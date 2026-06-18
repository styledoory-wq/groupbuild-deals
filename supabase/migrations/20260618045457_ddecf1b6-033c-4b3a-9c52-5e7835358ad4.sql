CREATE POLICY "Suppliers view requester profiles for visible quote requests"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.committee_quote_requests cqr
    LEFT JOIN public.suppliers s ON s.user_id = auth.uid()
    WHERE cqr.user_id = profiles.id
      AND cqr.status = 'open'
      AND (
        (cqr.supplier_id IS NOT NULL AND cqr.supplier_id = s.id)
        OR (cqr.supplier_id IS NULL AND cqr.category_id IS NOT NULL AND cqr.category_id = ANY (s.categories))
      )
  )
);