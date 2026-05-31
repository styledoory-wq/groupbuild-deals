
-- 1) REVIEWS: remove anon read; allow authenticated
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Authenticated can view reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.reviews FROM anon;

-- 2) SUPPLIERS: enforce column-level read for anon (safe public catalog columns only)
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (
  id, business_name, description, short_description, categories,
  serves_all_country, is_active, approval_status, created_at, updated_at,
  logo_url, website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  service_areas, supplier_kind, offers_products, offers_services,
  trust_score, verified_supplier, complaints_count, successful_redemptions,
  is_suspended, is_demo, is_deleted, deleted_at
) ON public.suppliers TO anon;
