
-- ============================================
-- STAGE 1: Hierarchical categories + supplier multi-category + tags + extended profile
-- ============================================

-- 1) EXTEND categories: hierarchy + metadata
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON public.categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_popular ON public.categories(is_popular) WHERE is_popular = true;

-- 2) SUPPLIER ↔ CATEGORY many-to-many
CREATE TABLE IF NOT EXISTS public.supplier_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_categories_supplier ON public.supplier_categories(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_category ON public.supplier_categories(category_id);

GRANT SELECT ON public.supplier_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supplier_categories TO authenticated;
GRANT ALL ON public.supplier_categories TO service_role;
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read supplier_categories"
  ON public.supplier_categories FOR SELECT USING (true);

CREATE POLICY "Suppliers manage own supplier_categories"
  ON public.supplier_categories FOR ALL
  TO authenticated
  USING (public.is_supplier_owner(supplier_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_supplier_owner(supplier_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

-- 3) SUPPLIER TAGS
CREATE TABLE IF NOT EXISTS public.supplier_tags (
  id text NOT NULL PRIMARY KEY,
  name_he text NOT NULL,
  name_en text,
  icon text,
  color text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.supplier_tags TO anon, authenticated;
GRANT ALL ON public.supplier_tags TO service_role;
ALTER TABLE public.supplier_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read supplier_tags"
  ON public.supplier_tags FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage supplier_tags"
  ON public.supplier_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Seed system tags
INSERT INTO public.supplier_tags (id, name_he, name_en, icon, color, display_order) VALUES
  ('recommended', 'מומלץ', 'Recommended', '⭐', '#F59E0B', 10),
  ('verified', 'מאומת', 'Verified', '✓', '#0E6B5A', 20),
  ('new', 'חדש', 'New', '🆕', '#3B82F6', 30),
  ('on_sale', 'במבצע', 'On Sale', '🔥', '#EF4444', 40),
  ('service_247', '24/7', '24/7', '🕐', '#8B5CF6', 50),
  ('emergency', 'שירות חירום', 'Emergency', '🚨', '#DC2626', 60),
  ('home_visit', 'מגיע עד הבית', 'Home Visit', '🚗', '#06B6D4', 70),
  ('warranty', 'נותן אחריות', 'Warranty', '🛡️', '#059669', 80),
  ('available_now', 'זמין עכשיו', 'Available Now', '⚡', '#10B981', 90)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.supplier_tag_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  tag_id text NOT NULL REFERENCES public.supplier_tags(id) ON DELETE CASCADE,
  assigned_by uuid,
  auto_assigned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_tag_assignments_supplier ON public.supplier_tag_assignments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tag_assignments_tag ON public.supplier_tag_assignments(tag_id);

GRANT SELECT ON public.supplier_tag_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supplier_tag_assignments TO authenticated;
GRANT ALL ON public.supplier_tag_assignments TO service_role;
ALTER TABLE public.supplier_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read supplier_tag_assignments"
  ON public.supplier_tag_assignments FOR SELECT USING (true);

CREATE POLICY "Admins manage supplier_tag_assignments"
  ON public.supplier_tag_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 4) EXTEND suppliers with rich profile fields
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS employees_count integer,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_response_time_hours integer,
  ADD COLUMN IF NOT EXISTS licenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekend_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_offered boolean NOT NULL DEFAULT false;

-- 5) supplier_gallery: media_type
ALTER TABLE public.supplier_gallery
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video'));
