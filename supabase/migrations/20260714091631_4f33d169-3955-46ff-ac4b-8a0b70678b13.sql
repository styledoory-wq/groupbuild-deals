
CREATE OR REPLACE FUNCTION public.search_catalog(_q text)
 RETURNS TABLE(id text, name text, icon text, level smallint, parent_id text, path text, supplier_count integer, score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT trim(coalesce(_q, '')) AS term
  ),
  matches AS (
    SELECT
      c.id, c.name, c.icon, c.level, c.parent_id, c.path,
      GREATEST(
        CASE WHEN c.name = (SELECT term FROM q) THEN 1.0 ELSE 0 END,
        CASE WHEN c.name ILIKE (SELECT term FROM q) || '%' THEN 0.95 ELSE 0 END,
        CASE WHEN c.name ILIKE '%' || (SELECT term FROM q) || '%' THEN 0.9 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || (SELECT term FROM q) || '%'
             OR (SELECT term FROM q) ILIKE '%' || k || '%'
        ) THEN 0.8 ELSE 0 END,
        similarity(c.name, (SELECT term FROM q)),
        COALESCE((
          SELECT MAX(similarity(k, (SELECT term FROM q)))
          FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
        ), 0)
      )::real AS score
    FROM public.categories c, q
    WHERE COALESCE(c.is_deleted, false) = false
      AND COALESCE(c.is_active, true) = true
      AND q.term <> ''
      AND (
        c.name ILIKE '%' || q.term || '%'
        OR similarity(c.name, q.term) > 0.18
        OR EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || q.term || '%'
             OR q.term ILIKE '%' || k || '%'
             OR similarity(k, q.term) > 0.4
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
  SELECT DISTINCT ON (id) id, name, icon, level, parent_id, path, supplier_count, score
  FROM with_counts
  ORDER BY id, score DESC
$function$;

-- Wrapper to apply final ordering: exact/prefix matches first, then services (deeper level) before broader nodes
CREATE OR REPLACE FUNCTION public.search_catalog(_q text)
 RETURNS TABLE(id text, name text, icon text, level smallint, parent_id text, path text, supplier_count integer, score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (SELECT trim(coalesce(_q, '')) AS term),
  matches AS (
    SELECT
      c.id, c.name, c.icon, c.level, c.parent_id, c.path,
      GREATEST(
        CASE WHEN c.name = (SELECT term FROM q) THEN 1.0 ELSE 0 END,
        CASE WHEN c.name ILIKE (SELECT term FROM q) || '%' THEN 0.95 ELSE 0 END,
        CASE WHEN c.name ILIKE '%' || (SELECT term FROM q) || '%' THEN 0.9 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || (SELECT term FROM q) || '%'
             OR (SELECT term FROM q) ILIKE '%' || k || '%'
        ) THEN 0.8 ELSE 0 END,
        similarity(c.name, (SELECT term FROM q)),
        COALESCE((
          SELECT MAX(similarity(k, (SELECT term FROM q)))
          FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
        ), 0)
      )::real AS score
    FROM public.categories c, q
    WHERE COALESCE(c.is_deleted, false) = false
      AND COALESCE(c.is_active, true) = true
      AND q.term <> ''
      AND (
        c.name ILIKE '%' || q.term || '%'
        OR similarity(c.name, q.term) > 0.18
        OR EXISTS (
          SELECT 1 FROM unnest(coalesce(c.search_keywords, '{}'::text[])) k
          WHERE k ILIKE '%' || q.term || '%'
             OR q.term ILIKE '%' || k || '%'
             OR similarity(k, q.term) > 0.4
        )
      )
  ),
  with_counts AS (
    SELECT m.*,
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
  ORDER BY score DESC, level DESC, supplier_count DESC, name ASC
  LIMIT 40;
$function$;
