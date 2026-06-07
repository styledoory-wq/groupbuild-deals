DROP POLICY IF EXISTS "Public can view active deals" ON public.deals;

CREATE POLICY "Public can view active and closed deals"
ON public.deals
FOR SELECT
TO public
USING (
  (status IN ('active','closed'))
  AND (COALESCE(is_deleted, false) = false)
  AND (EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = deals.supplier_id
      AND s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status = ANY (ARRAY['approved','active'])
  ))
  AND (
    visibility_type = 'public'
    OR (visibility_type = 'project_only'
        AND auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.project_id = deals.visibility_project_id))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);