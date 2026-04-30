-- Soft delete columns
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Extend deal_interests with lead/consent fields
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS estimated_quantity numeric;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new';

-- Update public viewing rule for deals: hide soft-deleted
DROP POLICY IF EXISTS "Public can view active deals" ON public.deals;
CREATE POLICY "Public can view active deals" ON public.deals
FOR SELECT USING (
  status = 'active'
  AND COALESCE(is_deleted, false) = false
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = deals.supplier_id
      AND s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status IN ('approved','active')
  )
);

-- Update public viewing rule for suppliers: hide soft-deleted
DROP POLICY IF EXISTS "Public can view approved active suppliers" ON public.suppliers;
CREATE POLICY "Public can view approved active suppliers" ON public.suppliers
FOR SELECT USING (
  (
    is_active = true
    AND COALESCE(is_deleted, false) = false
    AND approval_status IN ('approved','active')
  )
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update get_deal_interest_count to exclude soft-deleted
CREATE OR REPLACE FUNCTION public.get_deal_interest_count(_deal_id text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::int
  FROM public.deal_interests
  WHERE deal_id = _deal_id
    AND status IN ('interested','committed','paid','pending_deposit','joined')
    AND COALESCE(is_deleted, false) = false
$$;