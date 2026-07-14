
-- 1. Enable fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Fast indexes for name + keywords search across the tree
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON public.categories USING gin (name gin_trgm_ops)
  WHERE is_deleted = false AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_categories_keywords_gin
  ON public.categories USING gin (search_keywords)
  WHERE is_deleted = false AND is_active = true;

-- 3. Search RPC — traverses full tree, matches name + keywords + synonyms, returns path
CREATE OR REPLACE FUNCTION public.search_catalog(_q text)
RETURNS TABLE (
  id text,
  name text,
  icon text,
  level smallint,
  parent_id text,
  path text,
  supplier_count int,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT trim(coalesce(_q, '')) AS term
  ),
  matches AS (
    SELECT
      c.id, c.name, c.icon, c.level, c.parent_id, c.path,
      GREATEST(
        similarity(c.name, (SELECT term FROM q)),
        CASE WHEN c.name ILIKE '%' || (SELECT term FROM q) || '%' THEN 0.9 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || (SELECT term FROM q) || '%'
             OR (SELECT term FROM q) ILIKE '%' || k || '%'
        ) THEN 0.8 ELSE 0 END
      )::real AS score
    FROM public.categories c, q
    WHERE COALESCE(c.is_deleted, false) = false
      AND COALESCE(c.is_active, true) = true
      AND q.term <> ''
      AND (
        c.name ILIKE '%' || q.term || '%'
        OR similarity(c.name, q.term) > 0.25
        OR EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || q.term || '%'
             OR q.term ILIKE '%' || k || '%'
        )
      )
  ),
  with_counts AS (
    SELECT
      m.*,
      COALESCE((
        SELECT COUNT(DISTINCT sc.supplier_id)::int
        FROM public.supplier_categories sc
        JOIN public.suppliers s ON s.id = sc.supplier_id
        WHERE sc.category_id = m.id
          AND COALESCE(s.is_deleted, false) = false
          AND COALESCE(s.is_active, true) = true
          AND s.approval_status = ANY (ARRAY['approved','active'])
      ), 0) AS supplier_count
    FROM matches m
  )
  SELECT id, name, icon, level, parent_id, path, supplier_count, score
  FROM with_counts
  ORDER BY score DESC, level DESC, supplier_count DESC
  LIMIT 40;
$$;

GRANT EXECUTE ON FUNCTION public.search_catalog(text) TO anon, authenticated;
