-- =========== REGIONS ===========
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_he text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read regions"
  ON public.regions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage regions"
  ON public.regions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========== CITIES ===========
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he text NOT NULL,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name_he)
);
CREATE INDEX idx_cities_region ON public.cities(region_id);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read cities"
  ON public.cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage cities"
  ON public.cities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========== SUPPLIERS ===========
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  business_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  description text,
  categories text[] NOT NULL DEFAULT '{}',
  serves_all_country boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_user ON public.suppliers(user_id);
CREATE INDEX idx_suppliers_active ON public.suppliers(is_active);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active suppliers"
  ON public.suppliers FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Suppliers update own record"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppliers insert own record"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage suppliers"
  ON public.suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== SUPPLIER_REGIONS ===========
CREATE TABLE public.supplier_regions (
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, region_id)
);

ALTER TABLE public.supplier_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read supplier_regions"
  ON public.supplier_regions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers manage own regions"
  ON public.supplier_regions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage supplier_regions"
  ON public.supplier_regions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========== SUPPLIER_CITIES ===========
CREATE TABLE public.supplier_cities (
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, city_id)
);

ALTER TABLE public.supplier_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read supplier_cities"
  ON public.supplier_cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers manage own cities"
  ON public.supplier_cities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage supplier_cities"
  ON public.supplier_cities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========== PROFILE COLUMNS ===========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"email":true,"push":true,"sms":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS interest_categories text[] NOT NULL DEFAULT '{}';

-- =========== SEED REGIONS ===========
INSERT INTO public.regions (slug, name_he, display_order) VALUES
  ('north', 'צפון', 10),
  ('upper_galilee', 'גליל עליון', 20),
  ('lower_galilee', 'גליל תחתון', 30),
  ('golan', 'רמת הגולן', 40),
  ('valleys', 'עמקים', 50),
  ('haifa_krayot', 'חיפה והקריות', 60),
  ('sharon', 'שרון', 70),
  ('center', 'מרכז', 80),
  ('gush_dan', 'גוש דן', 90),
  ('jerusalem_area', 'ירושלים והסביבה', 100),
  ('south', 'דרום', 110);

-- =========== SEED CITIES ===========
INSERT INTO public.cities (name_he, region_id) VALUES
  ('צפת', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('בר יוחאי', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('מירון', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('ראש פינה', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('חצור הגלילית', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('קריית שמונה', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('מטולה', (SELECT id FROM public.regions WHERE slug='upper_galilee')),
  ('כרמיאל', (SELECT id FROM public.regions WHERE slug='lower_galilee')),
  ('טבריה', (SELECT id FROM public.regions WHERE slug='lower_galilee')),
  ('מעלות-תרשיחא', (SELECT id FROM public.regions WHERE slug='lower_galilee')),
  ('נהריה', (SELECT id FROM public.regions WHERE slug='lower_galilee')),
  ('עכו', (SELECT id FROM public.regions WHERE slug='lower_galilee')),
  ('קצרין', (SELECT id FROM public.regions WHERE slug='golan')),
  ('מג''דל שמס', (SELECT id FROM public.regions WHERE slug='golan')),
  ('עפולה', (SELECT id FROM public.regions WHERE slug='valleys')),
  ('בית שאן', (SELECT id FROM public.regions WHERE slug='valleys')),
  ('יקנעם', (SELECT id FROM public.regions WHERE slug='valleys')),
  ('מגדל העמק', (SELECT id FROM public.regions WHERE slug='valleys')),
  ('חיפה', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('קריית ביאליק', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('קריית מוצקין', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('קריית ים', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('קריית אתא', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('נשר', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('טירת כרמל', (SELECT id FROM public.regions WHERE slug='haifa_krayot')),
  ('הרצליה', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('כפר סבא', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('רעננה', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('הוד השרון', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('נתניה', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('פרדס חנה-כרכור', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('זכרון יעקב', (SELECT id FROM public.regions WHERE slug='sharon')),
  ('תל אביב-יפו', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('רמת גן', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('גבעתיים', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('בני ברק', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('פתח תקווה', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('בת ים', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('חולון', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('ראשון לציון', (SELECT id FROM public.regions WHERE slug='gush_dan')),
  ('רמלה', (SELECT id FROM public.regions WHERE slug='center')),
  ('לוד', (SELECT id FROM public.regions WHERE slug='center')),
  ('רחובות', (SELECT id FROM public.regions WHERE slug='center')),
  ('נס ציונה', (SELECT id FROM public.regions WHERE slug='center')),
  ('יבנה', (SELECT id FROM public.regions WHERE slug='center')),
  ('מודיעין-מכבים-רעות', (SELECT id FROM public.regions WHERE slug='center')),
  ('ירושלים', (SELECT id FROM public.regions WHERE slug='jerusalem_area')),
  ('בית שמש', (SELECT id FROM public.regions WHERE slug='jerusalem_area')),
  ('מבשרת ציון', (SELECT id FROM public.regions WHERE slug='jerusalem_area')),
  ('מעלה אדומים', (SELECT id FROM public.regions WHERE slug='jerusalem_area')),
  ('אשדוד', (SELECT id FROM public.regions WHERE slug='south')),
  ('אשקלון', (SELECT id FROM public.regions WHERE slug='south')),
  ('באר שבע', (SELECT id FROM public.regions WHERE slug='south')),
  ('קריית גת', (SELECT id FROM public.regions WHERE slug='south')),
  ('דימונה', (SELECT id FROM public.regions WHERE slug='south')),
  ('ערד', (SELECT id FROM public.regions WHERE slug='south')),
  ('אילת', (SELECT id FROM public.regions WHERE slug='south')),
  ('שדרות', (SELECT id FROM public.regions WHERE slug='south')),
  ('נתיבות', (SELECT id FROM public.regions WHERE slug='south')),
  ('אופקים', (SELECT id FROM public.regions WHERE slug='south'));