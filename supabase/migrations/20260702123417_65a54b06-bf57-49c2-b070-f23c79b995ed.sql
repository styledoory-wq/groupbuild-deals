
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp text;

-- Seed default from existing hardcoded value
UPDATE public.system_settings
SET support_whatsapp = COALESCE(support_whatsapp, '052-624-7941');

-- Allow anon/authenticated to read it (needed by the floating WhatsApp button on public pages)
GRANT SELECT ON public.system_settings TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'system_settings' AND policyname = 'public_read_system_settings'
  ) THEN
    CREATE POLICY public_read_system_settings
      ON public.system_settings
      FOR SELECT
      USING (true);
  END IF;
END $$;
