CREATE POLICY "Suppliers view open requests in their categories"
ON public.committee_quote_requests
FOR SELECT
USING (
  supplier_id IS NULL
  AND status = 'open'
  AND category_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND category_id = ANY(s.categories)
  )
);