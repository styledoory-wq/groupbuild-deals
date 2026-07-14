
-- ============ CITIES.SLUG ============
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS slug text;

-- Hebrew → simple ASCII transliteration for city slugs
CREATE OR REPLACE FUNCTION public.hebrew_to_slug(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE s text;
BEGIN
  IF _input IS NULL THEN RETURN NULL; END IF;
  s := _input;
  -- basic Hebrew letter translit
  s := replace(s, 'א', 'a');
  s := replace(s, 'ב', 'b');
  s := replace(s, 'ג', 'g');
  s := replace(s, 'ד', 'd');
  s := replace(s, 'ה', 'h');
  s := replace(s, 'ו', 'v');
  s := replace(s, 'ז', 'z');
  s := replace(s, 'ח', 'h');
  s := replace(s, 'ט', 't');
  s := replace(s, 'י', 'y');
  s := replace(s, 'כ', 'k'); s := replace(s, 'ך', 'k');
  s := replace(s, 'ל', 'l');
  s := replace(s, 'מ', 'm'); s := replace(s, 'ם', 'm');
  s := replace(s, 'נ', 'n'); s := replace(s, 'ן', 'n');
  s := replace(s, 'ס', 's');
  s := replace(s, 'ע', 'a');
  s := replace(s, 'פ', 'p'); s := replace(s, 'ף', 'p');
  s := replace(s, 'צ', 'ts'); s := replace(s, 'ץ', 'ts');
  s := replace(s, 'ק', 'k');
  s := replace(s, 'ר', 'r');
  s := replace(s, 'ש', 'sh');
  s := replace(s, 'ת', 't');
  s := lower(s);
  s := regexp_replace(s, '[^a-z0-9\s-]+', '', 'g');
  s := regexp_replace(s, '\s+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END;
$$;

UPDATE public.cities
SET slug = public.hebrew_to_slug(name_he)
WHERE slug IS NULL OR slug = '';

-- Collision fix
WITH dupes AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM public.cities WHERE slug IS NOT NULL
)
UPDATE public.cities c SET slug = c.slug || '-' || d.rn::text
FROM dupes d WHERE d.id = c.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key ON public.cities(slug) WHERE slug IS NOT NULL;
GRANT SELECT ON public.cities TO anon;

-- ============ SEARCH_GLOBAL RPC ============
CREATE OR REPLACE FUNCTION public.search_global(_q text)
RETURNS TABLE (
  result_type text,      -- 'category' | 'supplier' | 'city'
  id text,
  name text,
  subtitle text,
  slug text,
  icon text,
  supplier_count integer,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (SELECT trim(coalesce(_q, '')) AS term)
  -- Categories (uses existing search_catalog result set)
  SELECT
    'category'::text AS result_type,
    sc.id::text,
    sc.name,
    sc.path AS subtitle,
    (SELECT c.slug FROM public.categories c WHERE c.id = sc.id) AS slug,
    sc.icon,
    sc.supplier_count,
    sc.score
  FROM public.search_catalog((SELECT term FROM q)) sc

  UNION ALL

  -- Suppliers
  SELECT
    'supplier'::text,
    s.id::text,
    s.business_name,
    COALESCE(s.short_description, s.description),
    s.slug,
    s.logo_url,
    NULL::int,
    GREATEST(
      CASE WHEN s.business_name ILIKE (SELECT term FROM q) || '%' THEN 0.95 ELSE 0 END,
      CASE WHEN s.business_name ILIKE '%' || (SELECT term FROM q) || '%' THEN 0.85 ELSE 0 END,
      similarity(s.business_name, (SELECT term FROM q))
    )::real AS score
  FROM public.suppliers s, q
  WHERE q.term <> ''
    AND s.is_active = true
    AND COALESCE(s.is_deleted, false) = false
    AND s.approval_status = ANY (ARRAY['approved','active'])
    AND (
      s.business_name ILIKE '%' || q.term || '%'
      OR similarity(s.business_name, q.term) > 0.25
      OR COALESCE(s.short_description, '') ILIKE '%' || q.term || '%'
    )

  UNION ALL

  -- Cities
  SELECT
    'city'::text,
    c.id::text,
    c.name_he,
    'עיר',
    c.slug,
    NULL,
    NULL::int,
    GREATEST(
      CASE WHEN c.name_he = (SELECT term FROM q) THEN 1.0 ELSE 0 END,
      CASE WHEN c.name_he ILIKE (SELECT term FROM q) || '%' THEN 0.9 ELSE 0 END,
      similarity(c.name_he, (SELECT term FROM q))
    )::real AS score
  FROM public.cities c, q
  WHERE q.term <> ''
    AND (
      c.name_he ILIKE '%' || q.term || '%'
      OR similarity(c.name_he, q.term) > 0.35
    )

  ORDER BY score DESC NULLS LAST, name ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_global(text) TO anon, authenticated;

-- ============ CITY + CATEGORY RPC ============
CREATE OR REPLACE FUNCTION public.city_category_suppliers(_city_slug text, _category_slug text)
RETURNS TABLE (
  supplier_id uuid,
  business_name text,
  slug text,
  logo_url text,
  short_description text,
  phone text,
  whatsapp_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.id, s.business_name, s.slug, s.logo_url, s.short_description, s.phone, s.whatsapp_url
  FROM public.suppliers s
  JOIN public.supplier_categories sc ON sc.supplier_id = s.id
  JOIN public.categories cat ON cat.id = sc.category_id
  LEFT JOIN public.supplier_cities scy ON scy.supplier_id = s.id
  LEFT JOIN public.cities ci ON ci.id = scy.city_id
  WHERE s.is_active = true
    AND COALESCE(s.is_deleted, false) = false
    AND s.approval_status = ANY (ARRAY['approved','active'])
    AND cat.slug = _category_slug
    AND (ci.slug = _city_slug OR s.serves_all_country = true)
  ORDER BY s.business_name;
$$;

GRANT EXECUTE ON FUNCTION public.city_category_suppliers(text, text) TO anon, authenticated;

-- ============ LIST PUBLIC CITIES (for sitemap) ============
CREATE OR REPLACE FUNCTION public.list_public_cities()
RETURNS TABLE (slug text, name_he text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.slug, c.name_he
  FROM public.cities c
  WHERE c.slug IS NOT NULL
  ORDER BY c.name_he;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_cities() TO anon, authenticated;
