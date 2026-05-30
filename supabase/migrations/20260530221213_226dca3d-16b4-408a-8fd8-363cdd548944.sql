DROP POLICY IF EXISTS "Participants can view joined deals" ON public.deals;

CREATE POLICY "Participants can view joined deals"
ON public.deals
FOR SELECT
TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    EXISTS (
      SELECT 1
      FROM public.deal_interests di
      WHERE di.deal_id = deals.id::text
        AND di.user_id = auth.uid()
        AND COALESCE(di.is_deleted, false) = false
    )
    OR EXISTS (
      SELECT 1
      FROM public.vouchers v
      WHERE v.deal_id = deals.id::text
        AND v.user_id = auth.uid()
    )
  )
);