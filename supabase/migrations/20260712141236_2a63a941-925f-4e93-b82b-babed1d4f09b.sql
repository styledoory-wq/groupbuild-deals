
CREATE TABLE IF NOT EXISTS public.category_migration_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  old_category_id TEXT NOT NULL UNIQUE,
  new_category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  mapping_confidence TEXT NOT NULL DEFAULT 'high',
  needs_manual_review BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.category_migration_map TO anon, authenticated;
GRANT ALL ON public.category_migration_map TO service_role;
ALTER TABLE public.category_migration_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cmm_public_read" ON public.category_migration_map;
CREATE POLICY "cmm_public_read" ON public.category_migration_map FOR SELECT USING (true);
DROP POLICY IF EXISTS "cmm_admin_write" ON public.category_migration_map;
CREATE POLICY "cmm_admin_write" ON public.category_migration_map FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cmm_updated_at ON public.category_migration_map;
CREATE TRIGGER trg_cmm_updated_at BEFORE UPDATE ON public.category_migration_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.category_migration_map (old_category_id, new_category_id, mapping_confidence, needs_manual_review, notes) VALUES
  ('architect',              'sc-arch',         'high',   false, 'אדריכל'),
  ('plumbing',               'sc-plumb',        'high',   false, 'אינסטלציה'),
  ('bath',                   'sc-bath',         'high',   false, 'ארונות אמבט'),
  ('closets',                'sc-closets',      'high',   false, 'ארונות קיר'),
  ('smart-home',             'sc-smart',        'high',   false, 'בית חכם'),
  ('gypsum',                 'sc-gypsum',       'high',   false, 'גבס ובנייה קלה'),
  ('garden',                 'sc-garden',       'high',   false, 'גינון'),
  ('security-door',          'sc-doors',        'high',   false, 'דלתות פלדה'),
  ('doors',                  'sc-doors',        'high',   false, 'דלתות פנים'),
  ('cladding',               'sc-cladding',     'high',   false, 'חיפויי קיר'),
  ('windows',                'sc-windows',      'high',   false, 'חלונות ואלומיניום'),
  ('electric',               'sc-elec',         'high',   false, 'חשמל'),
  ('consultant',             'sc-consultants',  'high',   false, 'יועצים'),
  ('sanitary',               'sc-bath',         'medium', false, 'כלים סניטריים → אמבטיה'),
  ('kitchen',                'sc-kitchen',      'high',   false, 'מטבחים'),
  ('ac',                     'sc-climate',      'high',   false, 'מיזוג אוויר'),
  ('elevators',              NULL,              'manual', true,  'מעליות — אין תת־קטגוריה מדויקת'),
  ('interior-designer',      'sc-interior',     'high',   false, 'עיצוב פנים'),
  ('construction-supervisor','sc-supervision',  'high',   false, 'פיקוח בנייה'),
  ('intercom',               'sc-security',     'high',   false, 'מצלמות/אינטרקום → מערכות ביטחון'),
  ('showers',                'sc-bath',         'medium', false, 'מקלחונים → אמבטיה'),
  ('carpentry',              'sc-carpentry',    'high',   false, 'נגרות'),
  ('cleaning',               'sc-cleaning',     'high',   false, 'ניקיון'),
  ('c_1778448823740',        'sc-solar',        'high',   false, 'סולארי'),
  ('pergola',                'sc-hardscape',    'high',   false, 'פרגולות → פיתוח חוץ'),
  ('flooring',               'sc-floor',        'high',   false, 'ריצוף'),
  ('painting',               'sc-paint',        'high',   false, 'צבע וטיח'),
  ('turnkey-contractor',     'sc-contractors',  'high',   false, 'קבלן מפתח'),
  ('contractor',             'sc-contractors',  'high',   false, 'קבלן ראשי'),
  ('skeleton',               'sc-skeleton',     'high',   false, 'שלד'),
  ('lighting',               'sc-lighting',     'high',   false, 'תאורה')
ON CONFLICT (old_category_id) DO UPDATE
  SET new_category_id = EXCLUDED.new_category_id,
      mapping_confidence = EXCLUDED.mapping_confidence,
      needs_manual_review = EXCLUDED.needs_manual_review,
      notes = EXCLUDED.notes,
      updated_at = now();

-- UNIQUE constraint on supplier_categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_categories_supplier_id_category_id_key') THEN
    ALTER TABLE public.supplier_categories
      ADD CONSTRAINT supplier_categories_supplier_id_category_id_key UNIQUE (supplier_id, category_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.migrate_supplier_categories_from_legacy()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_supplier RECORD; v_old TEXT; v_new TEXT; v_first BOOLEAN;
  v_auto INT := 0; v_multi INT := 0; v_manual INT := 0; v_cnt INT;
  v_unmapped TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR v_supplier IN
    SELECT id, categories FROM public.suppliers WHERE COALESCE(is_deleted,false) = false
  LOOP
    v_first := true; v_cnt := 0;
    IF v_supplier.categories IS NOT NULL AND cardinality(v_supplier.categories) > 0 THEN
      FOREACH v_old IN ARRAY v_supplier.categories LOOP
        SELECT new_category_id INTO v_new FROM public.category_migration_map WHERE old_category_id = v_old;
        IF v_new IS NULL THEN
          IF NOT (v_old = ANY(v_unmapped)) THEN v_unmapped := array_append(v_unmapped, v_old); END IF;
          CONTINUE;
        END IF;
        INSERT INTO public.supplier_categories (supplier_id, category_id, is_primary, assigned_by)
        VALUES (v_supplier.id, v_new, v_first, NULL) ON CONFLICT DO NOTHING;
        v_first := false; v_cnt := v_cnt + 1;
      END LOOP;
    END IF;
    IF v_cnt > 0 THEN
      v_auto := v_auto + 1;
      IF v_cnt > 1 THEN v_multi := v_multi + 1; END IF;
    ELSE
      v_manual := v_manual + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object(
    'auto_mapped_suppliers', v_auto,
    'multi_category_suppliers', v_multi,
    'suppliers_needing_manual', v_manual,
    'unmapped_legacy_ids', v_unmapped
  );
END; $$;

CREATE OR REPLACE FUNCTION public.rollback_supplier_categories_migration()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  WITH del AS (DELETE FROM public.supplier_categories WHERE assigned_by IS NULL RETURNING 1)
    SELECT count(*) INTO v_count FROM del;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.category_migration_report()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total INT; v_with INT; v_multi INT; v_without INT;
  v_unmapped_old TEXT[]; v_new_cats INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.suppliers WHERE COALESCE(is_deleted,false)=false;
  SELECT COUNT(DISTINCT sc.supplier_id) INTO v_with
    FROM public.supplier_categories sc JOIN public.suppliers s ON s.id=sc.supplier_id
    WHERE COALESCE(s.is_deleted,false)=false;
  SELECT COUNT(*) INTO v_multi FROM (
    SELECT sc.supplier_id FROM public.supplier_categories sc
      JOIN public.suppliers s ON s.id=sc.supplier_id
      WHERE COALESCE(s.is_deleted,false)=false
      GROUP BY sc.supplier_id HAVING COUNT(*) > 1) x;
  v_without := v_total - v_with;
  SELECT COALESCE(array_agg(old_category_id), ARRAY[]::TEXT[]) INTO v_unmapped_old
    FROM public.category_migration_map WHERE new_category_id IS NULL;
  SELECT COUNT(*) INTO v_new_cats FROM public.categories WHERE is_deleted=false;
  RETURN jsonb_build_object(
    'total_active_suppliers', v_total,
    'suppliers_with_new_categories', v_with,
    'suppliers_multi_category', v_multi,
    'suppliers_needing_manual_mapping', v_without,
    'unmapped_legacy_category_ids', v_unmapped_old,
    'active_new_categories', v_new_cats
  );
END; $$;

SELECT public.migrate_supplier_categories_from_legacy();
