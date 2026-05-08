-- Deal images: cover + gallery
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage bucket for deal images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-images', 'deal-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for deal-images bucket
DO $$ BEGIN
  CREATE POLICY "Deal images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'deal-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload deal images to own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'deal-images'
      AND auth.uid() IS NOT NULL
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own deal images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'deal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own deal images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'deal-images'
      AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'::app_role))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage all deal images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'deal-images' AND public.has_role(auth.uid(),'admin'::app_role))
    WITH CHECK (bucket_id = 'deal-images' AND public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;