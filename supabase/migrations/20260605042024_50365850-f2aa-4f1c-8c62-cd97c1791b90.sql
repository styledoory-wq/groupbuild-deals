
-- 1) Normalize known city typos
UPDATE public.profiles SET city = 'בר יוחאי' WHERE city = 'בר יואחי';

-- 2) Backfill city_id / region_id on profiles from cities by Hebrew name
UPDATE public.profiles p
SET city_id = c.id,
    region_id = COALESCE(p.region_id, c.region_id)
FROM public.cities c
WHERE p.city_id IS NULL
  AND p.city IS NOT NULL
  AND TRIM(p.city) = TRIM(c.name_he);

-- 3) Trigger to keep city_id / region_id in sync whenever city text changes
CREATE OR REPLACE FUNCTION public.profiles_sync_city_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_id uuid;
  v_region_id uuid;
BEGIN
  IF NEW.city IS NOT NULL AND (NEW.city_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.city IS DISTINCT FROM OLD.city)) THEN
    SELECT c.id, c.region_id INTO v_city_id, v_region_id
    FROM public.cities c
    WHERE TRIM(c.name_he) = TRIM(NEW.city)
    LIMIT 1;
    IF v_city_id IS NOT NULL THEN
      NEW.city_id := v_city_id;
      IF NEW.region_id IS NULL THEN
        NEW.region_id := v_region_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_city_ids ON public.profiles;
CREATE TRIGGER trg_profiles_sync_city_ids
BEFORE INSERT OR UPDATE OF city ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_city_ids();
