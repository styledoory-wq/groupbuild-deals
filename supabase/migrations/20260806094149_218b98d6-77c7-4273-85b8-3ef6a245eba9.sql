
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- existing real suppliers are considered completed
UPDATE public.suppliers
   SET onboarding_completed_at = COALESCE(onboarding_completed_at, updated_at, created_at)
 WHERE onboarding_completed_at IS NULL
   AND approval_status IN ('pending','approved','active','rejected');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF meta_user_type = 'supplier' THEN
    INSERT INTO public.suppliers (
      user_id, business_name, contact_name, phone, email,
      is_active, approval_status, updated_at
    )
    SELECT
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name',''), NULLIF(NEW.raw_user_meta_data->>'full_name',''), 'הרשמה שלא הושלמה'),
      NULLIF(NEW.raw_user_meta_data->>'full_name',''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone',''), NEW.phone),
      NEW.email,
      false,
      'draft',
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.suppliers s WHERE s.user_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- backfill: supplier-role users with no supplier row
INSERT INTO public.suppliers (user_id, business_name, contact_name, phone, email, is_active, approval_status, updated_at)
SELECT u.id,
       COALESCE(NULLIF(p.business_name,''), NULLIF(p.full_name,''), 'הרשמה שלא הושלמה'),
       NULLIF(p.full_name,''),
       p.phone,
       u.email,
       false,
       'draft',
       now()
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'supplier'::app_role
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.user_id = u.id);

CREATE OR REPLACE FUNCTION public.save_supplier_onboarding(
  _business_name text,
  _contact_name text DEFAULT NULL::text,
  _phone text DEFAULT NULL::text,
  _email text DEFAULT NULL::text,
  _short_description text DEFAULT NULL::text,
  _category_ids text[] DEFAULT '{}'::text[],
  _serves_all_country boolean DEFAULT false,
  _region_ids uuid[] DEFAULT '{}'::uuid[],
  _city_ids uuid[] DEFAULT '{}'::uuid[],
  _logo_url text DEFAULT NULL::text,
  _completed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  clean_email text := nullif(trim(coalesce(_email, auth.jwt() ->> 'email', '')), '');
  sid uuid;
  prev_status text;
  prev_completed timestamptz;
  valid_category_ids text[] := '{}'::text[];
  valid_region_ids uuid[] := '{}'::uuid[];
  valid_city_ids uuid[] := '{}'::uuid[];
  new_status text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'נדרש להתחבר מחדש לפני שמירת ההרשמה';
  END IF;

  IF nullif(trim(coalesce(_business_name, '')), '') IS NULL OR length(trim(_business_name)) < 2 THEN
    RAISE EXCEPTION 'חסר שם עסק תקין';
  END IF;

  SELECT s.id, s.approval_status, s.onboarding_completed_at
    INTO sid, prev_status, prev_completed
  FROM public.suppliers s
  WHERE s.user_id = uid
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  IF sid IS NULL AND clean_email IS NOT NULL THEN
    SELECT s.id, s.approval_status, s.onboarding_completed_at
      INTO sid, prev_status, prev_completed
    FROM public.suppliers s
    WHERE s.user_id IS NULL
      AND coalesce(s.is_deleted, false) = false
      AND lower(coalesce(s.email, '')) = lower(clean_email)
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF array_length(coalesce(_category_ids, '{}'::text[]), 1) IS NOT NULL THEN
    SELECT coalesce(array_agg(c.id ORDER BY c.display_order, c.name), '{}'::text[])
      INTO valid_category_ids
    FROM public.categories c
    WHERE c.id = ANY(_category_ids)
      AND coalesce(c.is_active, true) = true
      AND coalesce(c.is_deleted, false) = false;
  END IF;

  IF NOT coalesce(_serves_all_country, false) THEN
    IF array_length(coalesce(_region_ids, '{}'::uuid[]), 1) IS NOT NULL THEN
      SELECT coalesce(array_agg(r.id ORDER BY r.name_he), '{}'::uuid[])
        INTO valid_region_ids
      FROM public.regions r WHERE r.id = ANY(_region_ids);
    END IF;
    IF array_length(coalesce(_city_ids, '{}'::uuid[]), 1) IS NOT NULL THEN
      SELECT coalesce(array_agg(c.id ORDER BY c.name_he), '{}'::uuid[])
        INTO valid_city_ids
      FROM public.cities c WHERE c.id = ANY(_city_ids);
    END IF;
  END IF;

  IF coalesce(prev_status,'') IN ('approved','active','rejected') THEN
    new_status := prev_status;
  ELSIF coalesce(_completed, false) OR prev_completed IS NOT NULL THEN
    new_status := 'pending';
  ELSE
    new_status := 'draft';
  END IF;

  IF sid IS NULL THEN
    INSERT INTO public.suppliers (
      user_id, business_name, contact_name, phone, email, short_description,
      categories, serves_all_country, service_areas, logo_url,
      is_active, approval_status, onboarding_completed_at, updated_at
    ) VALUES (
      uid,
      trim(_business_name),
      nullif(trim(coalesce(_contact_name, '')), ''),
      nullif(trim(coalesce(_phone, '')), ''),
      clean_email,
      nullif(trim(coalesce(_short_description, '')), ''),
      valid_category_ids,
      coalesce(_serves_all_country, false),
      CASE WHEN coalesce(_serves_all_country, false) THEN ARRAY['כל הארץ']::text[] ELSE '{}'::text[] END,
      nullif(trim(coalesce(_logo_url, '')), ''),
      new_status <> 'draft',
      new_status,
      CASE WHEN coalesce(_completed,false) THEN now() ELSE NULL END,
      now()
    )
    RETURNING id INTO sid;
  ELSE
    UPDATE public.suppliers
       SET user_id = uid,
           business_name = trim(_business_name),
           contact_name = nullif(trim(coalesce(_contact_name, '')), ''),
           phone = nullif(trim(coalesce(_phone, '')), ''),
           email = coalesce(clean_email, email, nullif(auth.jwt() ->> 'email', '')),
           short_description = nullif(trim(coalesce(_short_description, '')), ''),
           categories = valid_category_ids,
           serves_all_country = coalesce(_serves_all_country, false),
           service_areas = CASE WHEN coalesce(_serves_all_country, false) THEN ARRAY['כל הארץ']::text[] ELSE '{}'::text[] END,
           logo_url = nullif(trim(coalesce(_logo_url, '')), ''),
           is_active = CASE WHEN new_status = 'draft' THEN false ELSE true END,
           approval_status = new_status,
           onboarding_completed_at = CASE
             WHEN coalesce(_completed,false) THEN coalesce(onboarding_completed_at, now())
             ELSE onboarding_completed_at END,
           updated_at = now()
     WHERE id = sid;
  END IF;

  DELETE FROM public.supplier_regions WHERE supplier_id = sid;
  DELETE FROM public.supplier_cities WHERE supplier_id = sid;

  IF NOT coalesce(_serves_all_country, false) THEN
    IF array_length(valid_region_ids, 1) IS NOT NULL THEN
      INSERT INTO public.supplier_regions (supplier_id, region_id)
      SELECT sid, unnest(valid_region_ids) ON CONFLICT DO NOTHING;
    END IF;
    IF array_length(valid_city_ids, 1) IS NOT NULL THEN
      INSERT INTO public.supplier_cities (supplier_id, city_id)
      SELECT sid, unnest(valid_city_ids) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- notify admins once, when onboarding is first completed
  IF coalesce(_completed, false) THEN
    PERFORM 1 FROM public.suppliers s WHERE s.id = sid AND s.admin_notified_at IS NULL;
    IF FOUND THEN
      PERFORM public.notify_admins(
        'ספק חדש סיים הרשמה',
        trim(_business_name) || ' ממתין לאישור',
        'supplier_pending',
        '/admin/suppliers/' || sid::text,
        jsonb_build_object('supplier_id', sid)
      );
      UPDATE public.suppliers SET admin_notified_at = now() WHERE id = sid;
    END IF;
  END IF;

  RETURN sid;
END;
$function$;
