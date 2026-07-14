
-- ============================================================
-- Phase 1: Public directory infrastructure
-- - Add slug to suppliers + backfill + auto-trigger
-- - Populate empty slugs on categories
-- - Public read policy for non-deleted reviews (with a rating)
-- - New tables: supplier_analytics_events, search_queries
-- ============================================================

-- ---------- SLUG HELPER ----------
CREATE OR REPLACE FUNCTION public.slugify_text(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _input IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(_input));
  -- keep only ascii letters, digits, spaces and hyphens
  s := regexp_replace(s, '[^a-z0-9\s-]+', '', 'g');
  s := regexp_replace(s, '\s+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END;
$$;

-- ---------- SUPPLIERS.SLUG ----------
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS slug text;

-- Backfill: prefer slugified business_name, fallback to s-<short-uuid>
UPDATE public.suppliers
SET slug = COALESCE(
  NULLIF(public.slugify_text(business_name), ''),
  's-' || substr(id::text, 1, 8)
)
WHERE slug IS NULL OR slug = '';

-- Handle collisions: append short id suffix
WITH dupes AS (
  SELECT id, slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.suppliers
)
UPDATE public.suppliers s
SET slug = s.slug || '-' || substr(s.id::text, 1, 6)
FROM dupes d
WHERE d.id = s.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_slug_key ON public.suppliers(slug);

-- Auto-fill trigger
CREATE OR REPLACE FUNCTION public.suppliers_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := COALESCE(public.slugify_text(NEW.business_name), 's-' || substr(NEW.id::text, 1, 8));
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.suppliers WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppliers_set_slug ON public.suppliers;
CREATE TRIGGER trg_suppliers_set_slug
BEFORE INSERT OR UPDATE OF business_name ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.suppliers_set_slug();

-- ---------- CATEGORIES.SLUG backfill ----------
UPDATE public.categories
SET slug = COALESCE(NULLIF(public.slugify_text(name_en), ''), NULLIF(public.slugify_text(id), ''), id)
WHERE slug IS NULL OR slug = '';

-- Handle collisions
WITH dupes AS (
  SELECT id, slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.categories
  WHERE slug IS NOT NULL
)
UPDATE public.categories c
SET slug = c.slug || '-' || substr(c.id::text, 1, 6)
FROM dupes d
WHERE d.id = c.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories(slug) WHERE slug IS NOT NULL;

-- ---------- REVIEWS: public read for approved ----------
DROP POLICY IF EXISTS "Public can view non-deleted reviews" ON public.reviews;
CREATE POLICY "Public can view non-deleted reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_deleted, false) = false AND rating IS NOT NULL);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.supplier_gallery TO anon;
GRANT SELECT ON public.deals TO anon;
GRANT SELECT ON public.supplier_categories TO anon;

-- ---------- ANALYTICS EVENTS TABLE ----------
CREATE TABLE IF NOT EXISTS public.supplier_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'view','call','whatsapp','website','navigate','open_project','favorite_attempt','gallery_open','deal_click','share'
  )),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer text,
  page_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sae_supplier_time_idx ON public.supplier_analytics_events (supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sae_event_time_idx ON public.supplier_analytics_events (event_type, created_at DESC);

GRANT INSERT ON public.supplier_analytics_events TO anon, authenticated;
GRANT SELECT ON public.supplier_analytics_events TO authenticated;
GRANT ALL ON public.supplier_analytics_events TO service_role;

ALTER TABLE public.supplier_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
ON public.supplier_analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Suppliers view own analytics"
ON public.supplier_analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_analytics_events.supplier_id
      AND s.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ---------- SEARCH QUERIES TABLE ----------
CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_result_id text,
  clicked_result_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sq_query_idx ON public.search_queries (query);
CREATE INDEX IF NOT EXISTS sq_created_idx ON public.search_queries (created_at DESC);

GRANT INSERT ON public.search_queries TO anon, authenticated;
GRANT SELECT ON public.search_queries TO authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log searches"
ON public.search_queries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins view search queries"
ON public.search_queries
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- SUPPLIER STATS RPC ----------
CREATE OR REPLACE FUNCTION public.supplier_stats(_supplier_id uuid, _days integer DEFAULT 30)
RETURNS TABLE (
  event_type text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_type, count(*)::bigint
  FROM public.supplier_analytics_events
  WHERE supplier_id = _supplier_id
    AND created_at >= now() - (_days || ' days')::interval
    AND (
      EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = _supplier_id AND s.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  GROUP BY event_type;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_stats(uuid, integer) TO authenticated;
