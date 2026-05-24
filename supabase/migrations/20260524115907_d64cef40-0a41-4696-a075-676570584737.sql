
-- 1) admin_settings
DROP POLICY IF EXISTS "Authenticated read admin settings" ON public.admin_settings;

-- 2) system_settings
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.system_settings;

-- 3) Privilege-escalation: drop email-matching policies
DROP POLICY IF EXISTS "Suppliers update records matching verified email" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers view records matching verified email" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers manage gallery by verified email" ON public.supplier_gallery;
DROP POLICY IF EXISTS "Suppliers manage catalogs by verified email" ON public.supplier_catalogs;
DROP POLICY IF EXISTS "Suppliers manage cities by verified email" ON public.supplier_cities;
DROP POLICY IF EXISTS "Suppliers manage regions by verified email" ON public.supplier_regions;
DROP POLICY IF EXISTS "Suppliers update deals by verified email" ON public.deals;

-- 4) Hide sensitive supplier columns from anon (phone, email, contact_name, billing/commission)
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (
  id, user_id, business_name, description, short_description,
  logo_url, website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  categories, serves_all_country, service_areas,
  approval_status, is_active, is_deleted, created_at, updated_at,
  supplier_kind, offers_services, offers_products
) ON public.suppliers TO anon;

-- 5) Stop realtime broadcast of deposits
ALTER PUBLICATION supabase_realtime DROP TABLE public.deposits;

-- 6) Lock down SECURITY DEFINER trigger/internal functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_default_notification_settings() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_deposit_integrity() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.refresh_supplier_service_areas_on_supplier() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.refresh_supplier_service_areas_trigger() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_eval_conditional_on_deposit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_log_deposit_visibility() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_notify_deal_interest() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_notify_deposit_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_notify_new_supplier() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_notify_new_waitlist() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_notify_supplier_inquiry() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.refresh_supplier_service_areas(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.evaluate_conditional_joiners(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM anon, public;

-- 7) Public buckets: drop broad SELECT listing policies
DROP POLICY IF EXISTS "Public read supplier media" ON storage.objects;
DROP POLICY IF EXISTS "Deal images are publicly accessible" ON storage.objects;

-- 8) Remove duplicate permissive policies
DROP POLICY IF EXISTS "Anyone authenticated can read supplier_cities" ON public.supplier_cities;
DROP POLICY IF EXISTS "Anyone authenticated can read supplier_regions" ON public.supplier_regions;
