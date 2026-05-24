
-- 1. Backfill suppliers.user_id from auth.users by email (run first so new policies don't lock anyone out)
UPDATE public.suppliers s
SET user_id = u.id
FROM auth.users u
WHERE s.user_id IS NULL
  AND s.email IS NOT NULL
  AND lower(s.email) = lower(u.email);

-- 2. deal_interests: replace supplier SELECT policy (remove email fallback)
DROP POLICY IF EXISTS "Suppliers view interests on own deals" ON public.deal_interests;
CREATE POLICY "Suppliers view interests on own deals"
ON public.deal_interests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id::text = deal_interests.deal_id
      AND s.user_id = auth.uid()
  )
);

-- 3. supplier_inquiries: replace supplier SELECT + UPDATE policies (remove email fallback)
DROP POLICY IF EXISTS "Suppliers view inquiries on own supplier" ON public.supplier_inquiries;
CREATE POLICY "Suppliers view inquiries on own supplier"
ON public.supplier_inquiries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_inquiries.supplier_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Suppliers update inquiries on own supplier" ON public.supplier_inquiries;
CREATE POLICY "Suppliers update inquiries on own supplier"
ON public.supplier_inquiries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_inquiries.supplier_id
      AND s.user_id = auth.uid()
  )
);

-- 4. resident-documents storage: tighten SELECT policy (require matching documents row)
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users view own resident-documents" ON storage.objects;
DROP POLICY IF EXISTS "resident_documents_select_own" ON storage.objects;
CREATE POLICY "resident_documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.user_id = auth.uid()
      AND COALESCE(d.is_deleted, false) = false
      AND d.file_url LIKE '%' || storage.objects.name
  )
);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_deals_status_supplier
  ON public.deals (status, supplier_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_deals_status_created
  ON public.deals (status, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_deal_interests_deal_user
  ON public.deal_interests (deal_id, user_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_deposits_deal_status
  ON public.deposits (deal_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, is_read, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_supplier
  ON public.supplier_inquiries (supplier_id)
  WHERE is_deleted = false;
