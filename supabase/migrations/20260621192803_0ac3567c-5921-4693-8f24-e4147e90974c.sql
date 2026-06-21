
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS image_url text;

-- Storage policies for project-images bucket (bucket created via tool below)
CREATE POLICY "project-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "project-images admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "project-images admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "project-images admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));
