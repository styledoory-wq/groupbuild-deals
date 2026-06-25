
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing users are considered onboarded.
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_user_type TEXT := NEW.raw_user_meta_data->>'user_type';
  has_explicit_type BOOLEAN := meta_user_type IS NOT NULL AND meta_user_type <> '';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, city, user_type, business_name, project_id, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(meta_user_type, 'resident'),
    NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'project_id', ''),
    has_explicit_type
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  IF has_explicit_type THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, meta_user_type::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
