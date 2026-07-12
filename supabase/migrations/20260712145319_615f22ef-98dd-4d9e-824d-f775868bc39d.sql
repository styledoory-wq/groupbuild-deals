
-- Schema additions
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS execution_order integer,
  ADD COLUMN IF NOT EXISTS stage_key text;

CREATE INDEX IF NOT EXISTS idx_categories_stage_key ON public.categories(stage_key) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_categories_execution_order ON public.categories(execution_order) WHERE is_deleted = false;

-- Expand allowed project types
ALTER TABLE public.category_project_stages
  DROP CONSTRAINT IF EXISTS category_project_stages_project_type_check;
ALTER TABLE public.category_project_stages
  ADD CONSTRAINT category_project_stages_project_type_check
  CHECK (project_type = ANY (ARRAY['new'::text, 'reno'::text, 'building'::text, 'maintenance'::text, 'outdoor'::text]));

-- Seed missing subcategories (level 3)
INSERT INTO public.categories (id, name, icon, display_order, parent_id, level, slug, is_active, is_deleted)
VALUES
  ('sc-drilling',        'קידוחים ודיפון',      '🪨', 20, 'c-con-heavy',      3, 'drilling',        true, false),
  ('sc-site-fence',      'גידור אתר וניהול',    '🚧', 30, 'c-con-heavy',      3, 'site-fence',      true, false),
  ('sc-earthworks',      'עבודות עפר וניקוז',   '⛏️', 40, 'c-con-heavy',      3, 'earthworks',      true, false),
  ('sc-waterproof',      'איטום',              '💧', 20, 'c-con-envelope',   3, 'waterproof',      true, false),
  ('sc-roofing',         'גגות ורעפים',         '🏠', 30, 'c-con-envelope',   3, 'roofing',         true, false),
  ('sc-aluminum',        'אלומיניום ותריסים',   '🪟', 40, 'c-con-envelope',   3, 'aluminum',        true, false),
  ('sc-wallpaper',       'טפטים וחיפויי קיר',    '🖼️', 30, 'c-fin-walls',     3, 'wallpaper',       true, false),
  ('sc-parquet',         'פרקט',               '🪵', 30, 'c-fin-flooring',   3, 'parquet',         true, false),
  ('sc-gas',             'גז',                 '🔥', 20, 'c-sys-plumbing',   3, 'gas',             true, false),
  ('sc-ev-charging',     'טעינת רכב חשמלי',     '🔌', 30, 'c-sys-electrical', 3, 'ev-charging',     true, false),
  ('sc-fire',            'גילוי אש וספרינקלרים', '🚨', 20, 'c-sys-security',  3, 'fire',            true, false),
  ('sc-outdoor-kitchen', 'מטבח חוץ ופרגולה',    '🍖', 20, 'c-out-hardscape',  3, 'outdoor-kitchen', true, false),
  ('sc-irrigation',      'השקיה',              '💦', 20, 'c-out-garden',     3, 'irrigation',      true, false),
  ('sc-form-4',          'טופס 4 ומסירה',       '📋', 30, 'c-plan-inspection',3, 'form-4',          true, false),
  ('sc-post-cleaning',   'ניקיון לאחר בנייה',   '🧹', 20, 'c-mnt-cleaning',   3, 'post-cleaning',   true, false),
  ('sc-warranty',        'תיקוני בדק ואחריות',   '🛠️', 40, 'c-plan-inspection',3, 'warranty',        true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  is_active = true,
  is_deleted = false;

-- Assign stage_key to each subcategory
UPDATE public.categories SET stage_key = 'planning', execution_order = 10
  WHERE id IN ('sc-arch','sc-interior','sc-engineers','sc-consultants','sc-surveyors','sc-permits','sc-supervision','sc-inspection','sc-appraisers');
UPDATE public.categories SET stage_key = 'site-prep', execution_order = 20
  WHERE id IN ('sc-drilling','sc-site-fence','sc-earthworks','sc-heavy');
UPDATE public.categories SET stage_key = 'foundation', execution_order = 30
  WHERE id IN ('sc-skeleton','sc-contractors');
UPDATE public.categories SET stage_key = 'envelope', execution_order = 40
  WHERE id IN ('sc-waterproof','sc-roofing','sc-aluminum','sc-cladding','sc-windows','sc-doors');
UPDATE public.categories SET stage_key = 'systems', execution_order = 50
  WHERE id IN ('sc-elec','sc-plumb','sc-climate','sc-smart','sc-networks','sc-solar','sc-security','sc-gas','sc-ev-charging','sc-fire');
UPDATE public.categories SET stage_key = 'interior-prep', execution_order = 60
  WHERE id IN ('sc-paint','sc-gypsum');
UPDATE public.categories SET stage_key = 'finishes', execution_order = 70
  WHERE id IN ('sc-floor','sc-parquet','sc-carpentry','sc-kitchen','sc-closets','sc-bath','sc-lighting','sc-wallpaper');
UPDATE public.categories SET stage_key = 'outdoor', execution_order = 80
  WHERE id IN ('sc-garden','sc-irrigation','sc-hardscape','sc-fences','sc-pools','sc-outdoor-kitchen');
UPDATE public.categories SET stage_key = 'handover', execution_order = 90
  WHERE id IN ('sc-form-4','sc-post-cleaning','sc-warranty');

-- Reseed 'new' project type with 9 execution-ordered stages
DELETE FROM public.category_project_stages WHERE project_type = 'new';

INSERT INTO public.category_project_stages (project_type, stage_key, category_id, display_order) VALUES
  ('new','planning','sc-arch',10),
  ('new','planning','sc-interior',20),
  ('new','planning','sc-engineers',30),
  ('new','planning','sc-consultants',40),
  ('new','planning','sc-surveyors',50),
  ('new','planning','sc-permits',60),
  ('new','planning','sc-supervision',70),
  ('new','planning','sc-inspection',80),
  ('new','planning','sc-appraisers',90),
  ('new','site-prep','sc-earthworks',10),
  ('new','site-prep','sc-drilling',20),
  ('new','site-prep','sc-heavy',30),
  ('new','site-prep','sc-site-fence',40),
  ('new','foundation','sc-skeleton',10),
  ('new','foundation','sc-contractors',20),
  ('new','envelope','sc-waterproof',10),
  ('new','envelope','sc-cladding',20),
  ('new','envelope','sc-roofing',30),
  ('new','envelope','sc-aluminum',40),
  ('new','envelope','sc-windows',50),
  ('new','envelope','sc-doors',60),
  ('new','systems','sc-plumb',10),
  ('new','systems','sc-elec',20),
  ('new','systems','sc-networks',30),
  ('new','systems','sc-climate',40),
  ('new','systems','sc-gas',50),
  ('new','systems','sc-smart',60),
  ('new','systems','sc-security',70),
  ('new','systems','sc-fire',80),
  ('new','systems','sc-solar',90),
  ('new','systems','sc-ev-charging',100),
  ('new','interior-prep','sc-paint',10),
  ('new','interior-prep','sc-gypsum',20),
  ('new','finishes','sc-floor',10),
  ('new','finishes','sc-parquet',20),
  ('new','finishes','sc-cladding',30),
  ('new','finishes','sc-kitchen',40),
  ('new','finishes','sc-closets',50),
  ('new','finishes','sc-bath',60),
  ('new','finishes','sc-carpentry',70),
  ('new','finishes','sc-doors',80),
  ('new','finishes','sc-lighting',90),
  ('new','finishes','sc-wallpaper',100),
  ('new','outdoor','sc-hardscape',10),
  ('new','outdoor','sc-fences',20),
  ('new','outdoor','sc-garden',30),
  ('new','outdoor','sc-irrigation',40),
  ('new','outdoor','sc-pools',50),
  ('new','outdoor','sc-outdoor-kitchen',60),
  ('new','handover','sc-inspection',10),
  ('new','handover','sc-post-cleaning',20),
  ('new','handover','sc-form-4',30),
  ('new','handover','sc-warranty',40)
ON CONFLICT DO NOTHING;

-- Seed maintenance & outdoor project types
DELETE FROM public.category_project_stages WHERE project_type IN ('maintenance','outdoor');

INSERT INTO public.category_project_stages (project_type, stage_key, category_id, display_order) VALUES
  ('maintenance','routine','sc-cleaning',10),
  ('maintenance','routine','sc-garden',20),
  ('maintenance','systems-fix','sc-plumb',10),
  ('maintenance','systems-fix','sc-elec',20),
  ('maintenance','systems-fix','sc-climate',30),
  ('maintenance','systems-fix','sc-mnt-systems',40),
  ('maintenance','building-work','sc-paint',10),
  ('maintenance','building-work','sc-waterproof',20),
  ('maintenance','building-work','sc-cladding',30),
  ('outdoor','design','sc-arch',10),
  ('outdoor','design','sc-interior',20),
  ('outdoor','build','sc-hardscape',10),
  ('outdoor','build','sc-fences',20),
  ('outdoor','build','sc-outdoor-kitchen',30),
  ('outdoor','plants','sc-garden',10),
  ('outdoor','plants','sc-irrigation',20),
  ('outdoor','water','sc-pools',10)
ON CONFLICT DO NOTHING;
