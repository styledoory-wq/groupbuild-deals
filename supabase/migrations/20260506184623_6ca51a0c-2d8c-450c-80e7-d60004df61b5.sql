-- Allow residents to create lead notifications for suppliers
-- whose deal they are actually interested in.
CREATE POLICY "Residents create lead notifications for suppliers"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'lead'
  AND EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE s.user_id = notifications.user_id
      AND (d.id)::text = COALESCE(notifications.metadata->>'deal_id', '')
      AND EXISTS (
        SELECT 1 FROM public.deal_interests di
        WHERE di.user_id = auth.uid()
          AND di.deal_id = (d.id)::text
          AND COALESCE(di.is_deleted, false) = false
      )
  )
);