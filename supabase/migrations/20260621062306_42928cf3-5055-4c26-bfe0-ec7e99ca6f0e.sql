
-- Read: any authenticated user can read marketing-cards (URL paths are unguessable UUIDs)
CREATE POLICY "marketing_cards_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-cards');

-- Write: service_role only (edge function uses service role)
CREATE POLICY "marketing_cards_write_service" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'marketing-cards')
  WITH CHECK (bucket_id = 'marketing-cards');
