-- ============================================================
-- STAGE 2: Soft-delete legacy flat categories + seed hierarchical tree
-- 4 levels: domain (1) > category (2) > subcategory (3) > service (4)
-- Designed to scale to 100k+ suppliers without schema changes.
-- ============================================================

-- Ensure required columns/defaults exist (idempotent safety)
ALTER TABLE public.categories
  ALTER COLUMN is_deleted SET DEFAULT false,
  ALTER COLUMN is_active SET DEFAULT true;

-- 1) SOFT-DELETE all existing categories (no physical delete; suppliers/deals untouched)
UPDATE public.categories
   SET is_deleted = true,
       deleted_at = COALESCE(deleted_at, now()),
       is_active  = false
 WHERE COALESCE(is_deleted, false) = false;

-- 2) Helper to insert a category node
CREATE OR REPLACE FUNCTION public._seed_cat(
  _id text, _parent text, _level int, _name text, _slug text, _icon text, _order int
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.categories(id, parent_id, level, name, slug, icon, display_order, is_active, is_deleted)
  VALUES (_id, _parent, _level, _name, _slug, _icon, _order, true, false)
  ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    is_active = true,
    is_deleted = false,
    updated_at = now();
END; $$;

-- 3) SEED — 7 domains
SELECT public._seed_cat('d-planning',    NULL, 1, 'תכנון ורישוי', 'planning', '📐', 10);
SELECT public._seed_cat('d-construction',NULL, 1, 'בנייה ושלד', 'construction', '🏗️', 20);
SELECT public._seed_cat('d-systems',     NULL, 1, 'מערכות הבית', 'systems', '⚡', 30);
SELECT public._seed_cat('d-finishes',    NULL, 1, 'גמרים ועיצוב פנים', 'finishes', '🎨', 40);
SELECT public._seed_cat('d-outdoor',     NULL, 1, 'פיתוח חוץ וגינון', 'outdoor', '🌿', 50);
SELECT public._seed_cat('d-maintenance', NULL, 1, 'אחזקה ושירותי בניין', 'maintenance', '🧰', 60);
SELECT public._seed_cat('d-materials',   NULL, 1, 'חומרי בניין וציוד', 'materials', '🧱', 70);

-- ============================================================
-- DOMAIN 1: תכנון ורישוי
-- ============================================================
SELECT public._seed_cat('c-plan-design',      'd-planning', 2, 'תכנון ועיצוב', 'plan-design', '✏️', 10);
SELECT public._seed_cat('c-plan-engineering', 'd-planning', 2, 'הנדסה ויעוץ', 'plan-engineering', '📊', 20);
SELECT public._seed_cat('c-plan-permits',     'd-planning', 2, 'רישוי ופיקוח', 'plan-permits', '📋', 30);
SELECT public._seed_cat('c-plan-inspection',  'd-planning', 2, 'בדיקות ושמאות', 'plan-inspection', '🔍', 40);

-- תת + שירותים: תכנון ועיצוב
SELECT public._seed_cat('sc-arch',          'c-plan-design', 3, 'אדריכלות', 'architecture', '🏛️', 10);
SELECT public._seed_cat('s-arch-residential','sc-arch', 4, 'אדריכלות מגורים', 'arch-residential', '🏠', 10);
SELECT public._seed_cat('s-arch-commercial', 'sc-arch', 4, 'אדריכלות מסחרית', 'arch-commercial', '🏢', 20);
SELECT public._seed_cat('s-arch-renovation', 'sc-arch', 4, 'אדריכלות שיפוצים', 'arch-renovation', '🔨', 30);
SELECT public._seed_cat('s-arch-landscape',  'sc-arch', 4, 'אדריכלות נוף', 'arch-landscape', '🌳', 40);

SELECT public._seed_cat('sc-interior',        'c-plan-design', 3, 'עיצוב פנים', 'interior-design', '🛋️', 20);
SELECT public._seed_cat('s-interior-full',    'sc-interior', 4, 'עיצוב פנים מלא', 'interior-full', '🎨', 10);
SELECT public._seed_cat('s-interior-consult', 'sc-interior', 4, 'ייעוץ עיצוב', 'interior-consult', '💡', 20);
SELECT public._seed_cat('s-interior-staging', 'sc-interior', 4, 'הום סטיילינג', 'home-staging', '✨', 30);
SELECT public._seed_cat('s-interior-render',  'sc-interior', 4, 'הדמיות 3D', 'render-3d', '🖼️', 40);

-- תת + שירותים: הנדסה ויעוץ
SELECT public._seed_cat('sc-engineers',       'c-plan-engineering', 3, 'מהנדסים', 'engineers', '📐', 10);
SELECT public._seed_cat('s-eng-structural',   'sc-engineers', 4, 'מהנדס מבנים', 'eng-structural', '🏗️', 10);
SELECT public._seed_cat('s-eng-civil',        'sc-engineers', 4, 'מהנדס אזרחי', 'eng-civil', '🛣️', 20);
SELECT public._seed_cat('s-eng-electrical',   'sc-engineers', 4, 'מהנדס חשמל', 'eng-electrical', '⚡', 30);
SELECT public._seed_cat('s-eng-hvac',         'sc-engineers', 4, 'מהנדס מיזוג/אינסטלציה', 'eng-hvac', '❄️', 40);

SELECT public._seed_cat('sc-consultants',     'c-plan-engineering', 3, 'יועצים מקצועיים', 'consultants', '💼', 20);
SELECT public._seed_cat('s-cons-soil',        'sc-consultants', 4, 'יועץ קרקע', 'cons-soil', '🌍', 10);
SELECT public._seed_cat('s-cons-safety',      'sc-consultants', 4, 'יועץ בטיחות', 'cons-safety', '⚠️', 20);
SELECT public._seed_cat('s-cons-accessibility','sc-consultants',4, 'יועץ נגישות', 'cons-accessibility', '♿', 30);
SELECT public._seed_cat('s-cons-acoustic',    'sc-consultants', 4, 'יועץ אקוסטיקה', 'cons-acoustic', '🔊', 40);
SELECT public._seed_cat('s-cons-thermal',     'sc-consultants', 4, 'יועץ תרמי/אנרגיה', 'cons-thermal', '🌡️', 50);
SELECT public._seed_cat('s-cons-gas',         'sc-consultants', 4, 'יועץ גז', 'cons-gas', '🔥', 60);
SELECT public._seed_cat('s-cons-green',       'sc-consultants', 4, 'יועץ בנייה ירוקה', 'cons-green', '🌱', 70);
SELECT public._seed_cat('s-cons-fire',        'sc-consultants', 4, 'יועץ בטיחות אש', 'cons-fire', '🧯', 80);

SELECT public._seed_cat('sc-surveyors',       'c-plan-engineering', 3, 'מודדים', 'surveyors', '📏', 30);
SELECT public._seed_cat('s-surv-cadastral',   'sc-surveyors', 4, 'מדידה קדסטרית', 'surv-cadastral', '🗺️', 10);
SELECT public._seed_cat('s-surv-topographic', 'sc-surveyors', 4, 'מדידה טופוגרפית', 'surv-topographic', '⛰️', 20);

-- תת + שירותים: רישוי ופיקוח
SELECT public._seed_cat('sc-permits',         'c-plan-permits', 3, 'היתרי בנייה', 'permits', '📄', 10);
SELECT public._seed_cat('s-permit-new',       'sc-permits', 4, 'היתר בנייה חדש', 'permit-new', '🆕', 10);
SELECT public._seed_cat('s-permit-addition',  'sc-permits', 4, 'היתר תוספת/הרחבה', 'permit-addition', '➕', 20);
SELECT public._seed_cat('s-permit-tabu',      'sc-permits', 4, 'הסדרות טאבו וגושים', 'permit-tabu', '📚', 30);

SELECT public._seed_cat('sc-supervision',     'c-plan-permits', 3, 'פיקוח בנייה', 'supervision', '👷', 20);
SELECT public._seed_cat('s-sup-construction', 'sc-supervision', 4, 'פיקוח בנייה חדשה', 'sup-construction', '🏗️', 10);
SELECT public._seed_cat('s-sup-renovation',   'sc-supervision', 4, 'פיקוח שיפוצים', 'sup-renovation', '🔨', 20);
SELECT public._seed_cat('s-sup-quality',      'sc-supervision', 4, 'בקרת איכות', 'sup-quality', '✅', 30);

-- תת + שירותים: בדיקות ושמאות
SELECT public._seed_cat('sc-inspection',      'c-plan-inspection', 3, 'בדק בית', 'home-inspection', '🔍', 10);
SELECT public._seed_cat('s-insp-purchase',    'sc-inspection', 4, 'בדק בית לפני רכישה', 'insp-purchase', '🛒', 10);
SELECT public._seed_cat('s-insp-handover',    'sc-inspection', 4, 'בדק בית מסירת דירה', 'insp-handover', '🔑', 20);
SELECT public._seed_cat('s-insp-thermography','sc-inspection', 4, 'בדיקת תרמוגרפיה', 'insp-thermography', '🌡️', 30);
SELECT public._seed_cat('s-insp-mold',        'sc-inspection', 4, 'בדיקת רטיבות/עובש', 'insp-mold', '💧', 40);

SELECT public._seed_cat('sc-appraisers',      'c-plan-inspection', 3, 'שמאות', 'appraisers', '⚖️', 20);
SELECT public._seed_cat('s-appr-property',    'sc-appraisers', 4, 'שמאי מקרקעין', 'appr-property', '🏘️', 10);
SELECT public._seed_cat('s-appr-damages',     'sc-appraisers', 4, 'שמאי נזקים/ביטוח', 'appr-damages', '📉', 20);

-- ============================================================
-- DOMAIN 2: בנייה ושלד
-- ============================================================
SELECT public._seed_cat('c-con-contractor', 'd-construction', 2, 'קבלנות', 'contractors', '👷', 10);
SELECT public._seed_cat('c-con-skeleton',   'd-construction', 2, 'שלד ובטון', 'skeleton', '🧱', 20);
SELECT public._seed_cat('c-con-envelope',   'd-construction', 2, 'מעטפת ואיטום', 'envelope', '🛡️', 30);
SELECT public._seed_cat('c-con-heavy',      'd-construction', 2, 'ציוד כבד ותשתיות', 'heavy-equipment', '🚜', 40);

SELECT public._seed_cat('sc-contractors',     'c-con-contractor', 3, 'קבלנים ראשיים', 'main-contractors', '🏢', 10);
SELECT public._seed_cat('s-cont-turnkey',     'sc-contractors', 4, 'קבלן מפתח', 'turnkey', '🔑', 10);
SELECT public._seed_cat('s-cont-main',        'sc-contractors', 4, 'קבלן ראשי', 'main-contractor', '👷', 20);
SELECT public._seed_cat('s-cont-renovation',  'sc-contractors', 4, 'קבלן שיפוצים', 'renovation-contractor', '🔨', 30);
SELECT public._seed_cat('s-cont-tama',        'sc-contractors', 4, 'קבלן תמ״א 38', 'tama-contractor', '🏗️', 40);
SELECT public._seed_cat('s-cont-demolition',  'sc-contractors', 4, 'הריסות ופינוי', 'demolition', '💥', 50);

SELECT public._seed_cat('sc-skeleton',        'c-con-skeleton', 3, 'שלד', 'skeleton-work', '🧱', 10);
SELECT public._seed_cat('s-skel-concrete',    'sc-skeleton', 4, 'יציקת בטון', 'concrete', '🏗️', 10);
SELECT public._seed_cat('s-skel-formwork',    'sc-skeleton', 4, 'טפסנות', 'formwork', '📐', 20);
SELECT public._seed_cat('s-skel-iron',        'sc-skeleton', 4, 'ברזלנות', 'iron-work', '⛓️', 30);
SELECT public._seed_cat('s-skel-foundations', 'sc-skeleton', 4, 'יסודות', 'foundations', '🏛️', 40);
SELECT public._seed_cat('s-skel-mamad',       'sc-skeleton', 4, 'ממ״דים', 'mamad', '🛡️', 50);
SELECT public._seed_cat('s-skel-steel',       'sc-skeleton', 4, 'קונסטרוקציית פלדה', 'steel-construction', '🏗️', 60);
SELECT public._seed_cat('s-skel-prefab',      'sc-skeleton', 4, 'בנייה טרומית', 'prefab', '📦', 70);
SELECT public._seed_cat('s-skel-light',       'sc-skeleton', 4, 'בנייה קלה', 'light-construction', '🪵', 80);

SELECT public._seed_cat('sc-envelope',        'c-con-envelope', 3, 'מעטפת', 'envelope-work', '🏠', 10);
SELECT public._seed_cat('s-env-waterproof',   'sc-envelope', 4, 'איטום גגות/קירות', 'waterproofing', '💧', 10);
SELECT public._seed_cat('s-env-roofing',      'sc-envelope', 4, 'גגות ורעפים', 'roofing', '🏠', 20);
SELECT public._seed_cat('s-env-insulation',   'sc-envelope', 4, 'בידוד תרמי/אקוסטי', 'insulation', '🧊', 30);
SELECT public._seed_cat('s-env-facade',       'sc-envelope', 4, 'חיפוי חזיתות', 'facade', '🏢', 40);
SELECT public._seed_cat('s-env-scaffolding',  'sc-envelope', 4, 'פיגומים', 'scaffolding', '🪜', 50);

SELECT public._seed_cat('sc-heavy',           'c-con-heavy', 3, 'ציוד ותשתיות', 'heavy-infra', '🚜', 10);
SELECT public._seed_cat('s-heavy-cranes',     'sc-heavy', 4, 'מנופים', 'cranes', '🏗️', 10);
SELECT public._seed_cat('s-heavy-excavation', 'sc-heavy', 4, 'חפירות ועפר', 'excavation', '⛏️', 20);
SELECT public._seed_cat('s-heavy-drilling',   'sc-heavy', 4, 'קידוחים', 'drilling', '🔩', 30);
SELECT public._seed_cat('s-heavy-hauling',    'sc-heavy', 4, 'הובלת חומרים כבדים', 'hauling', '🚛', 40);

-- ============================================================
-- DOMAIN 3: מערכות הבית
-- ============================================================
SELECT public._seed_cat('c-sys-electrical', 'd-systems', 2, 'חשמל ותקשורת', 'sys-electrical', '⚡', 10);
SELECT public._seed_cat('c-sys-plumbing',   'd-systems', 2, 'אינסטלציה ומים', 'sys-plumbing', '🚿', 20);
SELECT public._seed_cat('c-sys-climate',    'd-systems', 2, 'מיזוג וחימום', 'sys-climate', '❄️', 30);
SELECT public._seed_cat('c-sys-energy',     'd-systems', 2, 'אנרגיה סולארית', 'sys-energy', '☀️', 40);
SELECT public._seed_cat('c-sys-security',   'd-systems', 2, 'ביטחון ובטיחות', 'sys-security', '🚨', 50);
SELECT public._seed_cat('c-sys-smart',      'd-systems', 2, 'בית חכם', 'sys-smart', '🏠', 60);

SELECT public._seed_cat('sc-elec',            'c-sys-electrical', 3, 'חשמל', 'electrical', '⚡', 10);
SELECT public._seed_cat('s-elec-install',     'sc-elec', 4, 'התקנת חשמל', 'elec-install', '🔌', 10);
SELECT public._seed_cat('s-elec-upgrade',     'sc-elec', 4, 'שדרוג לוח חשמל', 'elec-upgrade', '⚙️', 20);
SELECT public._seed_cat('s-elec-ev',          'sc-elec', 4, 'עמדות טעינה לרכב', 'elec-ev', '🔋', 30);
SELECT public._seed_cat('s-elec-emergency',   'sc-elec', 4, 'חשמלאי חירום 24/7', 'elec-emergency', '🚨', 40);

SELECT public._seed_cat('sc-networks',        'c-sys-electrical', 3, 'תקשורת ורשתות', 'networks', '📡', 20);
SELECT public._seed_cat('s-net-data',         'sc-networks', 4, 'תשתיות רשת/סיב', 'net-data', '🌐', 10);
SELECT public._seed_cat('s-net-intercom',     'sc-networks', 4, 'אינטרקום', 'intercom', '📞', 20);
SELECT public._seed_cat('s-net-tv',           'sc-networks', 4, 'טלוויזיה/לוויין', 'net-tv', '📺', 30);

SELECT public._seed_cat('sc-plumb',           'c-sys-plumbing', 3, 'אינסטלציה', 'plumbing', '🚿', 10);
SELECT public._seed_cat('s-plumb-install',    'sc-plumb', 4, 'התקנת אינסטלציה', 'plumb-install', '🔧', 10);
SELECT public._seed_cat('s-plumb-repair',     'sc-plumb', 4, 'תיקוני אינסטלציה', 'plumb-repair', '🛠️', 20);
SELECT public._seed_cat('s-plumb-emergency',  'sc-plumb', 4, 'אינסטלטור חירום', 'plumb-emergency', '🚨', 30);
SELECT public._seed_cat('s-plumb-drain',      'sc-plumb', 4, 'פתיחת סתימות', 'plumb-drain', '💧', 40);
SELECT public._seed_cat('s-plumb-gas',        'sc-plumb', 4, 'התקנת גז', 'plumb-gas', '🔥', 50);

SELECT public._seed_cat('sc-climate',         'c-sys-climate', 3, 'מיזוג אוויר', 'climate', '❄️', 10);
SELECT public._seed_cat('s-ac-split',         'sc-climate', 4, 'מזגן עילי/מפוצל', 'ac-split', '🌬️', 10);
SELECT public._seed_cat('s-ac-central',       'sc-climate', 4, 'מיזוג מרכזי', 'ac-central', '🏢', 20);
SELECT public._seed_cat('s-ac-vrf',           'sc-climate', 4, 'מיזוג VRF', 'ac-vrf', '⚙️', 30);
SELECT public._seed_cat('s-ac-service',       'sc-climate', 4, 'שירות ותחזוקת מזגנים', 'ac-service', '🔧', 40);
SELECT public._seed_cat('s-ac-underfloor',    'sc-climate', 4, 'חימום תת־רצפתי', 'underfloor-heating', '🔥', 50);

SELECT public._seed_cat('sc-solar',           'c-sys-energy', 3, 'מערכות סולאריות', 'solar', '☀️', 10);
SELECT public._seed_cat('s-solar-pv',         'sc-solar', 4, 'מערכת פוטו־וולטאית', 'solar-pv', '🔆', 10);
SELECT public._seed_cat('s-solar-water',      'sc-solar', 4, 'דוד שמש', 'solar-water', '🚿', 20);
SELECT public._seed_cat('s-solar-heatpump',   'sc-solar', 4, 'משאבת חום', 'heat-pump', '♨️', 30);
SELECT public._seed_cat('s-solar-battery',    'sc-solar', 4, 'סוללות אגירה', 'solar-battery', '🔋', 40);

SELECT public._seed_cat('sc-security',        'c-sys-security', 3, 'מערכות ביטחון', 'security-systems', '🚨', 10);
SELECT public._seed_cat('s-sec-cameras',      'sc-security', 4, 'מצלמות אבטחה', 'sec-cameras', '📹', 10);
SELECT public._seed_cat('s-sec-alarm',        'sc-security', 4, 'אזעקות', 'sec-alarm', '🚨', 20);
SELECT public._seed_cat('s-sec-fire',         'sc-security', 4, 'גילוי אש/עשן', 'sec-fire', '🔥', 30);
SELECT public._seed_cat('s-sec-sprinkler',    'sc-security', 4, 'ספרינקלרים', 'sec-sprinkler', '💦', 40);
SELECT public._seed_cat('s-sec-access',       'sc-security', 4, 'בקרת כניסה', 'sec-access', '🔐', 50);

SELECT public._seed_cat('sc-smart',           'c-sys-smart', 3, 'בית חכם', 'smart-home', '🏠', 10);
SELECT public._seed_cat('s-smart-full',       'sc-smart', 4, 'תכנון והתקנת בית חכם', 'smart-full', '⚙️', 10);
SELECT public._seed_cat('s-smart-lighting',   'sc-smart', 4, 'תאורה חכמה', 'smart-lighting', '💡', 20);
SELECT public._seed_cat('s-smart-blinds',     'sc-smart', 4, 'תריסים חשמליים חכמים', 'smart-blinds', '🪟', 30);
SELECT public._seed_cat('s-smart-voice',      'sc-smart', 4, 'שליטה קולית', 'smart-voice', '🗣️', 40);

-- ============================================================
-- DOMAIN 4: גמרים ועיצוב פנים
-- ============================================================
SELECT public._seed_cat('c-fin-flooring',   'd-finishes', 2, 'ריצוף וחיפוי', 'flooring', '🟫', 10);
SELECT public._seed_cat('c-fin-walls',      'd-finishes', 2, 'קירות וצבע', 'walls', '🎨', 20);
SELECT public._seed_cat('c-fin-kitchen',    'd-finishes', 2, 'מטבחים וארונות', 'kitchens', '🍳', 30);
SELECT public._seed_cat('c-fin-bath',       'd-finishes', 2, 'אמבטיה ושירותים', 'bathrooms', '🛁', 40);
SELECT public._seed_cat('c-fin-openings',   'd-finishes', 2, 'דלתות וחלונות', 'openings', '🚪', 50);
SELECT public._seed_cat('c-fin-carpentry',  'd-finishes', 2, 'נגרות ומוצרים', 'carpentry', '🪚', 60);

SELECT public._seed_cat('sc-floor',           'c-fin-flooring', 3, 'ריצוף', 'floor', '🟫', 10);
SELECT public._seed_cat('s-floor-porcelain',  'sc-floor', 4, 'גרניט פורצלן', 'porcelain', '⬜', 10);
SELECT public._seed_cat('s-floor-ceramic',    'sc-floor', 4, 'קרמיקה', 'ceramic', '🟨', 20);
SELECT public._seed_cat('s-floor-parquet',    'sc-floor', 4, 'פרקט עץ/למינציה', 'parquet', '🪵', 30);
SELECT public._seed_cat('s-floor-marble',     'sc-floor', 4, 'שיש ואבן טבעית', 'marble-stone', '⬛', 40);
SELECT public._seed_cat('s-floor-pvc',        'sc-floor', 4, 'PVC/ויניל', 'pvc', '🟦', 50);
SELECT public._seed_cat('s-floor-epoxy',      'sc-floor', 4, 'אפוקסי מיקרו־טופינג', 'epoxy', '✨', 60);
SELECT public._seed_cat('s-floor-polish',     'sc-floor', 4, 'ליטוש וחידוש רצפה', 'floor-polish', '💎', 70);

SELECT public._seed_cat('sc-cladding',        'c-fin-flooring', 3, 'חיפויי קיר', 'cladding', '🧱', 20);
SELECT public._seed_cat('s-clad-tiles',       'sc-cladding', 4, 'אריחי קיר', 'wall-tiles', '🟫', 10);
SELECT public._seed_cat('s-clad-stone',       'sc-cladding', 4, 'חיפוי אבן', 'stone-cladding', '⬛', 20);
SELECT public._seed_cat('s-clad-wood',        'sc-cladding', 4, 'חיפוי עץ', 'wood-cladding', '🪵', 30);
SELECT public._seed_cat('s-clad-3d',          'sc-cladding', 4, 'פאנלים תלת־מימד', 'panels-3d', '🔷', 40);

SELECT public._seed_cat('sc-paint',           'c-fin-walls', 3, 'צבע וטיח', 'paint', '🎨', 10);
SELECT public._seed_cat('s-paint-interior',   'sc-paint', 4, 'צביעת פנים', 'paint-interior', '🖌️', 10);
SELECT public._seed_cat('s-paint-exterior',   'sc-paint', 4, 'צביעת חוץ', 'paint-exterior', '🏠', 20);
SELECT public._seed_cat('s-paint-decorative', 'sc-paint', 4, 'טיח דקורטיבי', 'decorative-plaster', '✨', 30);
SELECT public._seed_cat('s-paint-wallpaper',  'sc-paint', 4, 'טפטים', 'wallpaper', '🖼️', 40);

SELECT public._seed_cat('sc-gypsum',          'c-fin-walls', 3, 'גבס ובנייה קלה', 'gypsum', '🧱', 20);
SELECT public._seed_cat('s-gyp-walls',        'sc-gypsum', 4, 'קירות גבס', 'gyp-walls', '📏', 10);
SELECT public._seed_cat('s-gyp-ceiling',      'sc-gypsum', 4, 'תקרות גבס', 'gyp-ceiling', '🔳', 20);
SELECT public._seed_cat('s-gyp-acoustic',     'sc-gypsum', 4, 'תקרות אקוסטיות', 'acoustic-ceiling', '🔊', 30);

SELECT public._seed_cat('sc-kitchen',         'c-fin-kitchen', 3, 'מטבחים', 'kitchen', '🍳', 10);
SELECT public._seed_cat('s-kit-custom',       'sc-kitchen', 4, 'מטבח בהזמנה אישית', 'kitchen-custom', '📐', 10);
SELECT public._seed_cat('s-kit-modular',      'sc-kitchen', 4, 'מטבח מודולרי', 'kitchen-modular', '📦', 20);
SELECT public._seed_cat('s-kit-worktop',      'sc-kitchen', 4, 'משטחי עבודה/קוריאן', 'kitchen-worktop', '⬜', 30);
SELECT public._seed_cat('s-kit-renovation',   'sc-kitchen', 4, 'שיפוץ מטבח', 'kitchen-renovation', '🔧', 40);

SELECT public._seed_cat('sc-closets',         'c-fin-kitchen', 3, 'ארונות', 'closets', '🚪', 20);
SELECT public._seed_cat('s-closet-walk-in',   'sc-closets', 4, 'ארון וורדרוב', 'walk-in', '👔', 10);
SELECT public._seed_cat('s-closet-sliding',   'sc-closets', 4, 'ארונות הזזה', 'sliding-closet', '➡️', 20);
SELECT public._seed_cat('s-closet-wall',      'sc-closets', 4, 'ארונות קיר', 'wall-closet', '🧺', 30);

SELECT public._seed_cat('sc-bath',            'c-fin-bath', 3, 'אמבטיה', 'bathroom', '🛁', 10);
SELECT public._seed_cat('s-bath-cabinets',    'sc-bath', 4, 'ארונות אמבט', 'bath-cabinets', '🪞', 10);
SELECT public._seed_cat('s-bath-showers',     'sc-bath', 4, 'מקלחונים', 'showers', '🚿', 20);
SELECT public._seed_cat('s-bath-sanitary',    'sc-bath', 4, 'כלים סניטריים', 'sanitary', '🚽', 30);
SELECT public._seed_cat('s-bath-jacuzzi',     'sc-bath', 4, 'ג׳קוזי ואמבט', 'jacuzzi', '💦', 40);
SELECT public._seed_cat('s-bath-renovation',  'sc-bath', 4, 'שיפוץ אמבטיה', 'bath-renovation', '🔨', 50);

SELECT public._seed_cat('sc-doors',           'c-fin-openings', 3, 'דלתות', 'doors', '🚪', 10);
SELECT public._seed_cat('s-door-interior',    'sc-doors', 4, 'דלתות פנים', 'door-interior', '🚪', 10);
SELECT public._seed_cat('s-door-entrance',    'sc-doors', 4, 'דלת כניסה', 'door-entrance', '🔑', 20);
SELECT public._seed_cat('s-door-security',    'sc-doors', 4, 'דלת פלדה/רב־בריח', 'door-security', '🛡️', 30);
SELECT public._seed_cat('s-door-fire',        'sc-doors', 4, 'דלתות אש', 'door-fire', '🔥', 40);

SELECT public._seed_cat('sc-windows',         'c-fin-openings', 3, 'חלונות ואלומיניום', 'windows', '🪟', 20);
SELECT public._seed_cat('s-win-aluminum',     'sc-windows', 4, 'חלונות אלומיניום', 'win-aluminum', '⬜', 10);
SELECT public._seed_cat('s-win-pvc',          'sc-windows', 4, 'חלונות PVC', 'win-pvc', '⬜', 20);
SELECT public._seed_cat('s-win-blinds',       'sc-windows', 4, 'תריסים', 'blinds', '🪟', 30);
SELECT public._seed_cat('s-win-mosquito',     'sc-windows', 4, 'רשתות נגד יתושים', 'mosquito-nets', '🕸️', 40);
SELECT public._seed_cat('s-win-glass',        'sc-windows', 4, 'זכוכית ומראות', 'glass-mirrors', '🪟', 50);

SELECT public._seed_cat('sc-carpentry',       'c-fin-carpentry', 3, 'נגרות', 'carpentry-work', '🪚', 10);
SELECT public._seed_cat('s-carp-custom',      'sc-carpentry', 4, 'נגרות מותאמת אישית', 'carp-custom', '🪵', 10);
SELECT public._seed_cat('s-carp-stairs',      'sc-carpentry', 4, 'מדרגות עץ', 'wood-stairs', '🪜', 20);
SELECT public._seed_cat('s-carp-tv-unit',     'sc-carpentry', 4, 'יחידות טלוויזיה/סלון', 'tv-units', '📺', 30);

SELECT public._seed_cat('sc-lighting',        'c-fin-carpentry', 3, 'תאורה וטקסטיל', 'lighting-textile', '💡', 20);
SELECT public._seed_cat('s-light-fixtures',   'sc-lighting', 4, 'גופי תאורה', 'light-fixtures', '💡', 10);
SELECT public._seed_cat('s-light-curtains',   'sc-lighting', 4, 'וילונות', 'curtains', '🪟', 20);
SELECT public._seed_cat('s-light-rugs',       'sc-lighting', 4, 'שטיחים', 'rugs', '🟫', 30);

-- ============================================================
-- DOMAIN 5: פיתוח חוץ וגינון
-- ============================================================
SELECT public._seed_cat('c-out-garden',   'd-outdoor', 2, 'גינון והשקיה', 'gardening', '🌿', 10);
SELECT public._seed_cat('c-out-hardscape','d-outdoor', 2, 'פיתוח חוץ ופרגולות', 'hardscape', '🏡', 20);
SELECT public._seed_cat('c-out-pools',    'd-outdoor', 2, 'בריכות ומים', 'pools', '🏊', 30);
SELECT public._seed_cat('c-out-fences',   'd-outdoor', 2, 'גדרות ושערים', 'fences-gates', '🚧', 40);

SELECT public._seed_cat('sc-garden',          'c-out-garden', 3, 'גינון', 'garden', '🌱', 10);
SELECT public._seed_cat('s-garden-design',    'sc-garden', 4, 'תכנון גינה', 'garden-design', '📐', 10);
SELECT public._seed_cat('s-garden-planting',  'sc-garden', 4, 'שתילה וגינון', 'planting', '🌿', 20);
SELECT public._seed_cat('s-garden-irrigation','sc-garden', 4, 'מערכות השקיה', 'irrigation', '💧', 30);
SELECT public._seed_cat('s-garden-synthetic', 'sc-garden', 4, 'דשא סינטטי', 'synthetic-grass', '🟩', 40);
SELECT public._seed_cat('s-garden-maintenance','sc-garden',4, 'תחזוקת גינה', 'garden-maintenance', '✂️', 50);

SELECT public._seed_cat('sc-hardscape',       'c-out-hardscape', 3, 'פיתוח חוץ', 'outdoor-work', '🏡', 10);
SELECT public._seed_cat('s-hard-pergola',     'sc-hardscape', 4, 'פרגולות', 'pergola', '🏛️', 10);
SELECT public._seed_cat('s-hard-decking',     'sc-hardscape', 4, 'דקים', 'decking', '🪵', 20);
SELECT public._seed_cat('s-hard-paving',      'sc-hardscape', 4, 'ריצוף חוץ/משטחים', 'outdoor-paving', '⬛', 30);
SELECT public._seed_cat('s-hard-bbq',         'sc-hardscape', 4, 'ברביקיו/מטבח חוץ', 'outdoor-kitchen', '🔥', 40);
SELECT public._seed_cat('s-hard-carport',     'sc-hardscape', 4, 'סככות רכב', 'carport', '🚗', 50);
SELECT public._seed_cat('s-hard-lighting',    'sc-hardscape', 4, 'תאורת גן', 'garden-lighting', '💡', 60);

SELECT public._seed_cat('sc-pools',           'c-out-pools', 3, 'בריכות', 'pools-work', '🏊', 10);
SELECT public._seed_cat('s-pool-build',       'sc-pools', 4, 'בניית בריכה', 'pool-build', '🔨', 10);
SELECT public._seed_cat('s-pool-maintenance', 'sc-pools', 4, 'תחזוקת בריכה', 'pool-maintenance', '🧪', 20);
SELECT public._seed_cat('s-pool-fountain',    'sc-pools', 4, 'מזרקות ומים נוי', 'fountains', '⛲', 30);

SELECT public._seed_cat('sc-fences',          'c-out-fences', 3, 'גדרות ושערים', 'fences', '🚧', 10);
SELECT public._seed_cat('s-fence-metal',      'sc-fences', 4, 'גדרות מתכת', 'fence-metal', '⛓️', 10);
SELECT public._seed_cat('s-fence-wood',       'sc-fences', 4, 'גדרות עץ', 'fence-wood', '🪵', 20);
SELECT public._seed_cat('s-gate-auto',        'sc-fences', 4, 'שערים אוטומטיים', 'gates-auto', '🚪', 30);

-- ============================================================
-- DOMAIN 6: אחזקה ושירותי בניין
-- ============================================================
SELECT public._seed_cat('c-mnt-cleaning',   'd-maintenance', 2, 'ניקיון ותברואה', 'cleaning', '🧹', 10);
SELECT public._seed_cat('c-mnt-building',   'd-maintenance', 2, 'אחזקת מבנה', 'building-maintenance', '🏢', 20);
SELECT public._seed_cat('c-mnt-services',   'd-maintenance', 2, 'שירותים לדייר/ועד', 'services', '🤝', 30);

SELECT public._seed_cat('sc-cleaning',        'c-mnt-cleaning', 3, 'ניקיון', 'cleaning-work', '🧹', 10);
SELECT public._seed_cat('s-clean-postbuild',  'sc-cleaning', 4, 'ניקיון לאחר שיפוץ', 'clean-postbuild', '✨', 10);
SELECT public._seed_cat('s-clean-facade',     'sc-cleaning', 4, 'ניקוי חזיתות/סנפלינג', 'clean-facade', '🧗', 20);
SELECT public._seed_cat('s-clean-polish',     'sc-cleaning', 4, 'פוליש ותחזוקת רצפות', 'clean-polish', '💎', 30);
SELECT public._seed_cat('s-clean-water-tanks','sc-cleaning', 4, 'ניקוי מיכלי מים', 'clean-water-tanks', '🚰', 40);
SELECT public._seed_cat('s-clean-pest',       'sc-cleaning', 4, 'הדברה', 'pest-control', '🐜', 50);
SELECT public._seed_cat('s-clean-waste',      'sc-cleaning', 4, 'פינוי פסולת/גזם', 'waste-removal', '🗑️', 60);

SELECT public._seed_cat('sc-mnt-systems',     'c-mnt-building', 3, 'אחזקת מערכות', 'sys-maintenance', '⚙️', 10);
SELECT public._seed_cat('s-mnt-elevator',     'sc-mnt-systems', 4, 'אחזקת מעליות', 'mnt-elevator', '🛗', 10);
SELECT public._seed_cat('s-mnt-ac',           'sc-mnt-systems', 4, 'אחזקת מיזוג', 'mnt-ac', '❄️', 20);
SELECT public._seed_cat('s-mnt-electric',     'sc-mnt-systems', 4, 'אחזקת חשמל', 'mnt-electric', '⚡', 30);
SELECT public._seed_cat('s-mnt-plumbing',     'sc-mnt-systems', 4, 'אחזקת אינסטלציה', 'mnt-plumbing', '🚿', 40);
SELECT public._seed_cat('s-mnt-waterproof',   'sc-mnt-systems', 4, 'איטום ותיקוני רטיבות', 'mnt-waterproof', '💧', 50);
SELECT public._seed_cat('s-mnt-paint',        'sc-mnt-systems', 4, 'צביעת מבנים/חדרי מדרגות', 'mnt-paint', '🎨', 60);
SELECT public._seed_cat('s-mnt-smart',        'sc-mnt-systems', 4, 'אחזקת בית חכם', 'mnt-smart', '🏠', 70);

SELECT public._seed_cat('sc-services',        'c-mnt-services', 3, 'שירותים לדייר וועד', 'resident-services', '🤝', 10);
SELECT public._seed_cat('s-svc-vaad',         'sc-services', 4, 'ניהול ועד בית', 'vaad-management', '📋', 10);
SELECT public._seed_cat('s-svc-moving',       'sc-services', 4, 'הובלות ואריזה', 'moving', '📦', 20);
SELECT public._seed_cat('s-svc-locksmith',    'sc-services', 4, 'מנעולנים', 'locksmith', '🔑', 30);
SELECT public._seed_cat('s-svc-handyman',     'sc-services', 4, 'הנדימן/תיקונים כלליים', 'handyman', '🛠️', 40);

-- ============================================================
-- DOMAIN 7: חומרי בניין וציוד
-- ============================================================
SELECT public._seed_cat('c-mat-supplies', 'd-materials', 2, 'חומרי בניין', 'building-supplies', '🧱', 10);
SELECT public._seed_cat('c-mat-tools',    'd-materials', 2, 'כלי עבודה וציוד', 'tools', '🔧', 20);
SELECT public._seed_cat('c-mat-rental',   'd-materials', 2, 'השכרת ציוד', 'equipment-rental', '📅', 30);

SELECT public._seed_cat('sc-supplies',        'c-mat-supplies', 3, 'חומרי בניין', 'supplies', '🧱', 10);
SELECT public._seed_cat('s-mat-cement',       'sc-supplies', 4, 'מלט ובטון', 'cement', '⬜', 10);
SELECT public._seed_cat('s-mat-iron',         'sc-supplies', 4, 'ברזל וקונסטרוקציה', 'iron-mat', '⛓️', 20);
SELECT public._seed_cat('s-mat-wood',         'sc-supplies', 4, 'עץ ולוחות', 'wood-mat', '🪵', 30);
SELECT public._seed_cat('s-mat-ceramic',      'sc-supplies', 4, 'קרמיקה וחיפויים', 'ceramic-mat', '🟨', 40);
SELECT public._seed_cat('s-mat-paint',        'sc-supplies', 4, 'צבע וחומרי גמר', 'paint-mat', '🎨', 50);
SELECT public._seed_cat('s-mat-plumbing',     'sc-supplies', 4, 'חומרי אינסטלציה', 'plumbing-mat', '🚿', 60);
SELECT public._seed_cat('s-mat-electric',     'sc-supplies', 4, 'חומרי חשמל', 'electric-mat', '⚡', 70);
SELECT public._seed_cat('s-mat-waterproof',   'sc-supplies', 4, 'חומרי איטום', 'waterproof-mat', '💧', 80);
SELECT public._seed_cat('s-mat-gypsum',       'sc-supplies', 4, 'גבס ופרופילים', 'gypsum-mat', '🧱', 90);

SELECT public._seed_cat('sc-tools',           'c-mat-tools', 3, 'כלי עבודה', 'work-tools', '🔧', 10);
SELECT public._seed_cat('s-tool-power',       'sc-tools', 4, 'כלי עבודה חשמליים', 'power-tools', '🔌', 10);
SELECT public._seed_cat('s-tool-hand',        'sc-tools', 4, 'כלי עבודה ידניים', 'hand-tools', '🔨', 20);
SELECT public._seed_cat('s-tool-safety',      'sc-tools', 4, 'ציוד בטיחות', 'safety-equip', '🦺', 30);

SELECT public._seed_cat('sc-rental',          'c-mat-rental', 3, 'השכרת ציוד', 'rental', '📅', 10);
SELECT public._seed_cat('s-rent-cranes',      'sc-rental', 4, 'השכרת מנופים', 'rent-cranes', '🏗️', 10);
SELECT public._seed_cat('s-rent-scaffold',    'sc-rental', 4, 'השכרת פיגומים', 'rent-scaffold', '🪜', 20);
SELECT public._seed_cat('s-rent-generator',   'sc-rental', 4, 'השכרת גנרטורים', 'rent-generator', '⚡', 30);
SELECT public._seed_cat('s-rent-container',   'sc-rental', 4, 'השכרת מכולות פסולת', 'rent-container', '🗑️', 40);

-- 4) Build materialized `path` (breadcrumb) for all seeded categories
UPDATE public.categories c
   SET path = (
     WITH RECURSIVE anc AS (
       SELECT id, parent_id, name, 0 AS depth FROM public.categories WHERE id = c.id
       UNION ALL
       SELECT p.id, p.parent_id, p.name, anc.depth + 1
         FROM public.categories p JOIN anc ON anc.parent_id = p.id
     )
     SELECT string_agg(name, ' > ' ORDER BY depth DESC) FROM anc
   )
 WHERE COALESCE(is_deleted, false) = false;

-- 5) Clean up helper
DROP FUNCTION public._seed_cat(text, text, int, text, text, text, int);

-- 6) Popular flags (for the homepage chips)
UPDATE public.categories SET is_popular = true
 WHERE id IN (
   's-cont-renovation','s-kit-renovation','s-bath-renovation','s-paint-interior',
   's-floor-porcelain','s-ac-split','s-elec-install','s-plumb-emergency',
   's-solar-pv','s-garden-design','s-clean-postbuild','s-arch-residential'
 );