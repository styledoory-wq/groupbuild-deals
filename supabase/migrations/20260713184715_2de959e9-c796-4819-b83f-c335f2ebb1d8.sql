CREATE OR REPLACE FUNCTION public.save_supplier_onboarding(
  _business_name text,
  _contact_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _short_description text DEFAULT NULL,
  _category_ids text[] DEFAULT '{}'::text[],
  _serves_all_country boolean DEFAULT false,
  _region_ids uuid[] DEFAULT '{}'::uuid[],
  _city_ids uuid[] DEFAULT '{}'::uuid[],
  _logo_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  clean_email text := nullif(trim(coalesce(_email, auth.jwt() ->> 'email', '')), '');
  sid uuid;
  valid_category_ids text[] := '{}'::text[];
  valid_region_ids uuid[] := '{}'::uuid[];
  valid_city_ids uuid[] := '{}'::uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'נדרש להתחבר מחדש לפני שמירת ההרשמה';
  END IF;

  IF nullif(trim(coalesce(_business_name, '')), '') IS NULL OR length(trim(_business_name)) < 2 THEN
    RAISE EXCEPTION 'חסר שם עסק תקין';
  END IF;

  SELECT s.id INTO sid
  FROM public.suppliers s
  WHERE s.user_id = uid
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  IF sid IS NULL AND clean_email IS NOT NULL THEN
    SELECT s.id INTO sid
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
      FROM public.regions r
      WHERE r.id = ANY(_region_ids)
        AND coalesce(r.is_active, true) = true;
    END IF;

    IF array_length(coalesce(_city_ids, '{}'::uuid[]), 1) IS NOT NULL THEN
      SELECT coalesce(array_agg(c.id ORDER BY c.name_he), '{}'::uuid[])
        INTO valid_city_ids
      FROM public.cities c
      WHERE c.id = ANY(_city_ids)
        AND coalesce(c.is_active, true) = true;
    END IF;
  END IF;

  IF sid IS NULL THEN
    INSERT INTO public.suppliers (
      user_id,
      business_name,
      contact_name,
      phone,
      email,
      short_description,
      categories,
      serves_all_country,
      service_areas,
      logo_url,
      is_active,
      approval_status,
      updated_at
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
      true,
      'pending',
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
           is_active = true,
           approval_status = CASE WHEN approval_status IN ('approved', 'active') THEN approval_status ELSE 'pending' END,
           updated_at = now()
     WHERE id = sid;
  END IF;

  DELETE FROM public.supplier_regions WHERE supplier_id = sid;
  DELETE FROM public.supplier_cities WHERE supplier_id = sid;
  DELETE FROM public.supplier_categories WHERE supplier_id = sid;

  IF NOT coalesce(_serves_all_country, false) THEN
    INSERT INTO public.supplier_regions (supplier_id, region_id)
    SELECT sid, unnest(valid_region_ids)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.supplier_cities (supplier_id, city_id)
    SELECT sid, unnest(valid_city_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.supplier_categories (supplier_id, category_id, is_primary, assigned_by)
  SELECT sid, cid, row_number() OVER () = 1, uid
  FROM unnest(valid_category_ids) AS cid
  ON CONFLICT (supplier_id, category_id) DO UPDATE
    SET is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by;

  UPDATE public.profiles
     SET user_type = 'supplier',
         onboarding_completed = true,
         business_name = trim(_business_name),
         full_name = coalesce(nullif(trim(coalesce(_contact_name, '')), ''), full_name),
         phone = coalesce(nullif(trim(coalesce(_phone, '')), ''), phone),
         email = coalesce(clean_email, email),
         updated_at = now()
   WHERE id = uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'supplier'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN sid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_supplier_onboarding(text, text, text, text, text, text[], boolean, uuid[], uuid[], text) TO service_role;