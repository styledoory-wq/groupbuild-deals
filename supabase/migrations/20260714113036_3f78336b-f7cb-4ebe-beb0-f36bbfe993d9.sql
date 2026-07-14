
-- Allow reveal_phone as a valid event type
ALTER TABLE public.supplier_analytics_events DROP CONSTRAINT IF EXISTS supplier_analytics_events_event_type_check;
ALTER TABLE public.supplier_analytics_events ADD CONSTRAINT supplier_analytics_events_event_type_check
  CHECK (event_type IN (
    'view','call','reveal_phone','whatsapp','website','navigate',
    'open_project','favorite_attempt','gallery_open','deal_click','share'
  ));

-- Composite index for fast aggregation
CREATE INDEX IF NOT EXISTS sae_supplier_event_time_idx
  ON public.supplier_analytics_events (supplier_id, event_type, created_at DESC);

-- Helper: check if current user owns a supplier row or is admin
CREATE OR REPLACE FUNCTION public.can_view_supplier_analytics(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = _supplier_id AND s.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin');
$$;

-- ============ SUMMARY (current + previous period) ============
CREATE OR REPLACE FUNCTION public.supplier_analytics_summary(
  _supplier_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  event_type text,
  current_count bigint,
  previous_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  span interval;
  prev_from timestamptz;
  prev_to timestamptz;
BEGIN
  IF NOT public.can_view_supplier_analytics(_supplier_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  span := _to - _from;
  prev_to := _from;
  prev_from := _from - span;

  RETURN QUERY
  WITH types AS (
    SELECT unnest(ARRAY[
      'view','call','reveal_phone','whatsapp','website','navigate',
      'open_project','favorite_attempt','gallery_open','deal_click','share'
    ]) AS et
  ),
  cur AS (
    SELECT e.event_type, count(*)::bigint AS c
    FROM public.supplier_analytics_events e
    WHERE e.supplier_id = _supplier_id AND e.created_at >= _from AND e.created_at < _to
    GROUP BY e.event_type
  ),
  prv AS (
    SELECT e.event_type, count(*)::bigint AS c
    FROM public.supplier_analytics_events e
    WHERE e.supplier_id = _supplier_id AND e.created_at >= prev_from AND e.created_at < prev_to
    GROUP BY e.event_type
  )
  SELECT t.et,
         COALESCE(cur.c, 0),
         COALESCE(prv.c, 0)
  FROM types t
  LEFT JOIN cur ON cur.event_type = t.et
  LEFT JOIN prv ON prv.event_type = t.et;
END;
$$;

-- ============ TIME SERIES (daily) ============
CREATE OR REPLACE FUNCTION public.supplier_analytics_timeseries(
  _supplier_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  day date,
  views bigint,
  calls bigint,
  whatsapp bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_supplier_analytics(_supplier_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from)::date, date_trunc('day', _to - interval '1 second')::date, interval '1 day')::date AS d
  ),
  agg AS (
    SELECT
      date_trunc('day', e.created_at)::date AS d,
      count(*) FILTER (WHERE e.event_type = 'view')::bigint AS views,
      count(*) FILTER (WHERE e.event_type IN ('call','reveal_phone'))::bigint AS calls,
      count(*) FILTER (WHERE e.event_type = 'whatsapp')::bigint AS whatsapp
    FROM public.supplier_analytics_events e
    WHERE e.supplier_id = _supplier_id AND e.created_at >= _from AND e.created_at < _to
    GROUP BY 1
  )
  SELECT days.d,
         COALESCE(agg.views, 0),
         COALESCE(agg.calls, 0),
         COALESCE(agg.whatsapp, 0)
  FROM days LEFT JOIN agg ON agg.d = days.d
  ORDER BY days.d;
END;
$$;

-- ============ TRAFFIC SOURCES ============
CREATE OR REPLACE FUNCTION public.supplier_analytics_sources(
  _supplier_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  source text,
  count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_supplier_analytics(_supplier_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH e AS (
    SELECT
      CASE
        WHEN utm_source ILIKE 'share%' OR page_url ILIKE '%utm_source=share%' THEN 'share'
        WHEN referrer ILIKE '%google.%' OR referrer ILIKE '%bing.%' OR referrer ILIKE '%duckduckgo%' THEN 'google'
        WHEN page_url ~ '/city/[^/]+/[^/]+' THEN 'city_category'
        WHEN page_url ~ '/category/' THEN 'category'
        WHEN page_url ~ '/search' OR referrer ~ '/search' THEN 'internal_search'
        WHEN referrer IS NULL OR referrer = '' THEN 'direct'
        WHEN referrer ~ ('https?://' || current_setting('request.headers', true)::json->>'host') THEN 'internal'
        ELSE 'referral'
      END AS source
    FROM public.supplier_analytics_events
    WHERE supplier_id = _supplier_id
      AND created_at >= _from AND created_at < _to
      AND event_type = 'view'
  )
  SELECT source, count(*)::bigint
  FROM e
  GROUP BY source
  ORDER BY 2 DESC;
END;
$$;

-- ============ TOP SEARCH TERMS leading to supplier ============
CREATE OR REPLACE FUNCTION public.supplier_analytics_search_terms(
  _supplier_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit int DEFAULT 15
)
RETURNS TABLE (
  query text,
  count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_supplier_analytics(_supplier_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT sq.query, count(*)::bigint
  FROM public.search_queries sq
  WHERE sq.clicked_result_type = 'supplier'
    AND sq.clicked_result_id = _supplier_id::text
    AND sq.created_at >= _from AND sq.created_at < _to
  GROUP BY sq.query
  ORDER BY 2 DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_supplier_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_analytics_summary(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_analytics_timeseries(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_analytics_sources(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_analytics_search_terms(uuid, timestamptz, timestamptz, int) TO authenticated;
