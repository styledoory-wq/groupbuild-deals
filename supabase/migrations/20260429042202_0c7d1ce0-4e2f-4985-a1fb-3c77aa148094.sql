-- 1. Extend suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS catalog_url text;

-- 2. Gallery table
CREATE TABLE IF NOT EXISTS public.supplier_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery"
  ON public.supplier_gallery FOR SELECT
  USING (true);

CREATE POLICY "Suppliers manage own gallery"
  ON public.supplier_gallery FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_gallery.supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_gallery.supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage gallery"
  ON public.supplier_gallery FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_supplier_gallery_supplier ON public.supplier_gallery(supplier_id, display_order);

-- 3. Storage buckets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('supplier-logos', 'supplier-logos', true),
  ('supplier-gallery', 'supplier-gallery', true),
  ('supplier-catalogs', 'supplier-catalogs', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS
-- Public read on the three buckets
CREATE POLICY "Public read supplier media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs'));

-- Authenticated users may write to their own user-id folder
CREATE POLICY "Users upload to own folder (supplier media)"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own files (supplier media)"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own files (supplier media)"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins manage all supplier media files
CREATE POLICY "Admins manage supplier media files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs')
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id IN ('supplier-logos','supplier-gallery','supplier-catalogs')
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );