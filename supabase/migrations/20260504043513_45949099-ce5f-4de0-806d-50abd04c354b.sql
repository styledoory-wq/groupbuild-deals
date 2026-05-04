-- 1. Visibility columns
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS visibility_type text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visibility_project_id text;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_visibility_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_visibility_type_check
  CHECK (visibility_type IN ('public','project_only'));

-- 2. Update public SELECT policy on deals to respect visibility
DROP POLICY IF EXISTS "Public can view active deals" ON public.deals;

CREATE POLICY "Public can view active deals"
ON public.deals
FOR SELECT
TO public
USING (
  status = 'active'
  AND COALESCE(is_deleted, false) = false
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = deals.supplier_id
      AND s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status = ANY (ARRAY['approved'::text, 'active'::text])
  )
  AND (
    visibility_type = 'public'
    OR (
      visibility_type = 'project_only'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.project_id = deals.visibility_project_id
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.suppliers s2
      WHERE s2.id = deals.supplier_id AND s2.user_id = auth.uid()
    )
  )
);

-- 3. Global stats helpers for landing page
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS TABLE(
  residents_count int,
  suppliers_count int,
  active_deals_count int,
  paid_deposits_count int,
  total_savings numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.profiles
       WHERE user_type = 'resident' AND COALESCE(is_deleted,false) = false)::int,
    (SELECT COUNT(*)::int FROM public.suppliers
       WHERE approval_status = ANY (ARRAY['approved','active'])
         AND is_active = true AND COALESCE(is_deleted,false) = false)::int,
    (SELECT COUNT(*)::int FROM public.deals
       WHERE status = 'active' AND COALESCE(is_deleted,false) = false)::int,
    (SELECT COUNT(*)::int FROM public.deposits
       WHERE status = 'paid' AND COALESCE(is_deleted,false) = false)::int,
    COALESCE((
      SELECT SUM(GREATEST(d.original_price - COALESCE(d.discounted_price, d.original_price), 0))
      FROM public.deposits dep
      JOIN public.deals d ON d.id::text = dep.deal_id
      WHERE dep.status = 'paid' AND COALESCE(dep.is_deleted,false) = false
    ), 0)::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;
