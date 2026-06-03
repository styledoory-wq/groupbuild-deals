
-- =====================================================
-- Phase 4: Area hierarchy + project stages
-- =====================================================

-- 1) Regional councils (מועצות אזוריות / איגודי ערים)
CREATE TABLE IF NOT EXISTS public.regional_councils (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_he text NOT NULL,
  slug text NOT NULL UNIQUE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.regional_councils TO anon, authenticated;
GRANT ALL ON public.regional_councils TO service_role;

ALTER TABLE public.regional_councils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read regional_councils"
  ON public.regional_councils FOR SELECT
  USING (true);

CREATE POLICY "Admins manage regional_councils"
  ON public.regional_councils FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_regional_councils_region ON public.regional_councils(region_id);

-- 2) Add council_id to cities
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS council_id uuid REFERENCES public.regional_councils(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cities_council ON public.cities(council_id);

-- 3) Project stages
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'planning';

-- 4) Category stage tagging (planning / structure / systems / finishes / outdoor)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS stage text;

CREATE INDEX IF NOT EXISTS idx_categories_stage ON public.categories(stage);

-- 5) Supplier ↔ Council join table (extends supplier_regions / supplier_cities)
CREATE TABLE IF NOT EXISTS public.supplier_councils (
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  council_id uuid NOT NULL REFERENCES public.regional_councils(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, council_id)
);

GRANT SELECT ON public.supplier_councils TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_councils TO authenticated;
GRANT ALL ON public.supplier_councils TO service_role;

ALTER TABLE public.supplier_councils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read supplier_councils"
  ON public.supplier_councils FOR SELECT
  USING (true);

CREATE POLICY "Admins manage supplier_councils"
  ON public.supplier_councils FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Suppliers manage own councils"
  ON public.supplier_councils FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_councils.supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_councils.supplier_id AND s.user_id = auth.uid()));

-- 6) Trigger: refresh supplier.service_areas when supplier_councils changes
CREATE OR REPLACE FUNCTION public.refresh_supplier_service_areas(_supplier_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  area_names text[];
  serves_all boolean;
BEGIN
  SELECT serves_all_country INTO serves_all
  FROM public.suppliers
  WHERE id = _supplier_id;

  SELECT COALESCE(array_agg(DISTINCT name ORDER BY name), '{}') INTO area_names
  FROM (
    SELECT r.name_he AS name
    FROM public.supplier_regions sr
    JOIN public.regions r ON r.id = sr.region_id
    WHERE sr.supplier_id = _supplier_id
    UNION
    SELECT rc.name_he AS name
    FROM public.supplier_councils scc
    JOIN public.regional_councils rc ON rc.id = scc.council_id
    WHERE scc.supplier_id = _supplier_id
    UNION
    SELECT c.name_he AS name
    FROM public.supplier_cities sc
    JOIN public.cities c ON c.id = sc.city_id
    WHERE sc.supplier_id = _supplier_id
  ) areas;

  UPDATE public.suppliers
  SET service_areas = CASE
    WHEN COALESCE(serves_all, false) THEN ARRAY['כל הארץ']::text[]
    ELSE area_names
  END
  WHERE id = _supplier_id;
END;
$function$;

DROP TRIGGER IF EXISTS trg_supplier_councils_refresh ON public.supplier_councils;
CREATE TRIGGER trg_supplier_councils_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_councils
  FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_service_areas_trigger();

-- 7) RPC: get matching deals for the current authenticated user
-- Matches by area hierarchy (exact city → council → region → nationwide)
-- and optionally filters by project stage (category.stage = project.current_stage).
CREATE OR REPLACE FUNCTION public.get_matching_deals_for_user(_stage_filter text DEFAULT NULL, _limit int DEFAULT 30)
 RETURNS TABLE (
   deal_id uuid,
   match_priority int
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_city_id uuid;
  v_council_id uuid;
  v_region_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT p.city_id, c.council_id, c.region_id
    INTO v_city_id, v_council_id, v_region_id
  FROM public.profiles p
  LEFT JOIN public.cities c ON c.id = p.city_id
  WHERE p.id = v_uid
  LIMIT 1;

  -- Fallback: resolve region by profile.region slug if city_id missing
  IF v_region_id IS NULL THEN
    SELECT r.id INTO v_region_id
    FROM public.profiles p
    JOIN public.regions r ON r.slug = p.region
    WHERE p.id = v_uid
    LIMIT 1;
  END IF;

  RETURN QUERY
  WITH allowed_suppliers AS (
    SELECT s.id,
           CASE
             WHEN v_city_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.supplier_cities sc WHERE sc.supplier_id = s.id AND sc.city_id = v_city_id
             ) THEN 1
             WHEN v_council_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.supplier_councils scc WHERE scc.supplier_id = s.id AND scc.council_id = v_council_id
             ) THEN 2
             WHEN v_region_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.supplier_regions sr WHERE sr.supplier_id = s.id AND sr.region_id = v_region_id
             ) THEN 3
             WHEN s.serves_all_country = true THEN 4
             ELSE NULL
           END AS prio
    FROM public.suppliers s
    WHERE s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status = ANY (ARRAY['approved','active'])
  )
  SELECT d.id AS deal_id, a.prio AS match_priority
  FROM public.deals d
  JOIN allowed_suppliers a ON a.id = d.supplier_id AND a.prio IS NOT NULL
  LEFT JOIN public.categories cat ON cat.id = d.category_id
  WHERE d.status = 'active'
    AND COALESCE(d.is_deleted, false) = false
    AND (_stage_filter IS NULL OR cat.stage = _stage_filter)
  ORDER BY a.prio ASC, d.created_at DESC
  LIMIT _limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_matching_deals_for_user(text, int) TO anon, authenticated;
