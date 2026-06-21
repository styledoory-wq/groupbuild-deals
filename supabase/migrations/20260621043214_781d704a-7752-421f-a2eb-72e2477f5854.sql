
-- Add missing categories used by "building" project type
INSERT INTO public.categories (id, name, icon, display_order, is_active, is_deleted)
VALUES
  ('elevators', 'מעליות', '🛗', 300, true, false),
  ('intercom', 'מצלמות ואינטרקום', '📹', 310, true, false)
ON CONFLICT (id) DO NOTHING;

-- Mapping table: which categories belong to each (project_type, stage)
CREATE TABLE IF NOT EXISTS public.category_project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type text NOT NULL CHECK (project_type IN ('new','reno','building')),
  stage_key text NOT NULL,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, stage_key, category_id)
);

GRANT SELECT ON public.category_project_stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_project_stages TO authenticated;
GRANT ALL ON public.category_project_stages TO service_role;

ALTER TABLE public.category_project_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_stages_read_all" ON public.category_project_stages
  FOR SELECT USING (true);

CREATE POLICY "category_stages_admin_write" ON public.category_project_stages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed from current hardcoded mapping
INSERT INTO public.category_project_stages (project_type, stage_key, category_id, display_order) VALUES
  -- NEW BUILD
  ('new','planning','architect',10),
  ('new','planning','interior-designer',20),
  ('new','planning','consultant',30),
  ('new','planning','construction-supervisor',40),
  ('new','structure','contractor',10),
  ('new','structure','skeleton',20),
  ('new','structure','turnkey-contractor',30),
  ('new','envelope','cladding',10),
  ('new','envelope','windows',20),
  ('new','envelope','doors',30),
  ('new','systems','electric',10),
  ('new','systems','plumbing',20),
  ('new','systems','ac',30),
  ('new','systems','smart-home',40),
  ('new','finishes','painting',10),
  ('new','finishes','flooring',20),
  ('new','finishes','gypsum',30),
  ('new','finishes','carpentry',40),
  ('new','finishes','closets',50),
  ('new','finishes','lighting',60),
  ('new','finishes','kitchen',70),
  ('new','finishes','bath',80),
  ('new','outdoor','garden',10),
  ('new','outdoor','pergola',20),
  -- RENO
  ('reno','kitchen-bath','kitchen',10),
  ('reno','kitchen-bath','bath',20),
  ('reno','kitchen-bath','sanitary',30),
  ('reno','kitchen-bath','showers',40),
  ('reno','paint-gypsum','painting',10),
  ('reno','paint-gypsum','gypsum',20),
  ('reno','electric','electric',10),
  ('reno','electric','lighting',20),
  ('reno','electric','smart-home',30),
  ('reno','plumbing','plumbing',10),
  ('reno','ac','ac',10),
  ('reno','flooring','flooring',10),
  ('reno','flooring','cladding',20),
  ('reno','doors-windows','doors',10),
  ('reno','doors-windows','windows',20),
  ('reno','doors-windows','security-door',30),
  -- BUILDING (shared)
  ('building','elevators','elevators',10),
  ('building','cleaning','cleaning',10),
  ('building','garden','garden',10),
  ('building','cctv','intercom',10),
  ('building','entrance','security-door',10),
  ('building','entrance','doors',20),
  ('building','shared-electric','electric',10),
  ('building','shared-electric','lighting',20),
  ('building','facade','cladding',10),
  ('building','facade','painting',20),
  ('building','solar','c_1778448823740',10)
ON CONFLICT (project_type, stage_key, category_id) DO NOTHING;
