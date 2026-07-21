
-- 1) Table
CREATE TABLE public.suppliers_public_profiles (
  supplier_id          uuid PRIMARY KEY REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id              uuid,
  business_name        text        NOT NULL,
  slug                 text        UNIQUE,
  short_description    text,
  description          text,
  logo_url             text,
  website_url          text,
  whatsapp_url         text,
  instagram_url        text,
  facebook_url         text,
  catalog_url          text,
  phone                text,
  categories           text[]      NOT NULL DEFAULT '{}',
  service_areas        text[]      NOT NULL DEFAULT '{}',
  serves_all_country   boolean     NOT NULL DEFAULT false,
  supplier_kind        text,
  offers_services      boolean     NOT NULL DEFAULT false,
  offers_products      boolean     NOT NULL DEFAULT false,
  approval_status      text        NOT NULL,
  is_active            boolean     NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX suppliers_public_profiles_active_idx
  ON public.suppliers_public_profiles (is_active, approval_status);
CREATE INDEX suppliers_public_profiles_service_areas_idx
  ON public.suppliers_public_profiles USING gin (service_areas);
CREATE INDEX suppliers_public_profiles_categories_idx
  ON public.suppliers_public_profiles USING gin (categories);
CREATE UNIQUE INDEX suppliers_public_profiles_user_idx
  ON public.suppliers_public_profiles (user_id) WHERE user_id IS NOT NULL;

-- 2) GRANTs — read-only for public; writes only via SECURITY DEFINER trigger / service_role
GRANT SELECT ON public.suppliers_public_profiles TO anon, authenticated;
GRANT ALL    ON public.suppliers_public_profiles TO service_role;

-- 3) RLS: only approved & active rows visible
ALTER TABLE public.suppliers_public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read approved suppliers"
  ON public.suppliers_public_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND approval_status IN ('approved','active'));
-- No INSERT/UPDATE/DELETE policies -> blocked for anon/authenticated.

-- 4) Sync function + trigger
CREATE OR REPLACE FUNCTION public.sync_supplier_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.suppliers_public_profiles WHERE supplier_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_deleted OR NEW.is_suspended
     OR NEW.is_active = false
     OR NEW.approval_status NOT IN ('approved','active') THEN
    DELETE FROM public.suppliers_public_profiles WHERE supplier_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.suppliers_public_profiles AS p (
    supplier_id, user_id, business_name, slug,
    short_description, description, logo_url,
    website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
    phone,
    categories, service_areas, serves_all_country,
    supplier_kind, offers_services, offers_products,
    approval_status, is_active,
    created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.user_id, NEW.business_name, NEW.slug,
    NEW.short_description, NEW.description, NEW.logo_url,
    NEW.website_url, NEW.whatsapp_url, NEW.instagram_url, NEW.facebook_url, NEW.catalog_url,
    NEW.phone,
    NEW.categories, NEW.service_areas, NEW.serves_all_country,
    NEW.supplier_kind, NEW.offers_services, NEW.offers_products,
    NEW.approval_status, NEW.is_active,
    NEW.created_at, now()
  )
  ON CONFLICT (supplier_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    business_name = EXCLUDED.business_name,
    slug = EXCLUDED.slug,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    website_url = EXCLUDED.website_url,
    whatsapp_url = EXCLUDED.whatsapp_url,
    instagram_url = EXCLUDED.instagram_url,
    facebook_url = EXCLUDED.facebook_url,
    catalog_url = EXCLUDED.catalog_url,
    phone = EXCLUDED.phone,
    categories = EXCLUDED.categories,
    service_areas = EXCLUDED.service_areas,
    serves_all_country = EXCLUDED.serves_all_country,
    supplier_kind = EXCLUDED.supplier_kind,
    offers_services = EXCLUDED.offers_services,
    offers_products = EXCLUDED.offers_products,
    approval_status = EXCLUDED.approval_status,
    is_active = EXCLUDED.is_active,
    updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_supplier_public_profile
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_public_profile();

-- 5) Backfill existing approved+active suppliers
INSERT INTO public.suppliers_public_profiles (
  supplier_id, user_id, business_name, slug,
  short_description, description, logo_url,
  website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  phone,
  categories, service_areas, serves_all_country,
  supplier_kind, offers_services, offers_products,
  approval_status, is_active,
  created_at, updated_at
)
SELECT
  id, user_id, business_name, slug,
  short_description, description, logo_url,
  website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  phone,
  categories, service_areas, serves_all_country,
  supplier_kind, offers_services, offers_products,
  approval_status, is_active,
  created_at, now()
FROM public.suppliers
WHERE is_deleted = false
  AND is_suspended = false
  AND is_active = true
  AND approval_status IN ('approved','active')
ON CONFLICT (supplier_id) DO NOTHING;
