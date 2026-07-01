
CREATE OR REPLACE FUNCTION public.match_suppliers_for_demand(_demand_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.demand_requests%ROWTYPE;
  v_row RECORD;
  v_inserted int := 0;
  v_new_invite_id uuid;
  v_category_name text;
BEGIN
  SELECT * INTO v_demand FROM public.demand_requests WHERE id = _demand_id;
  IF v_demand.id IS NULL THEN RAISE EXCEPTION 'demand_not_found'; END IF;

  SELECT name INTO v_category_name FROM public.categories WHERE id = v_demand.category_id;

  FOR v_row IN
    SELECT DISTINCT s.id, s.user_id
    FROM public.suppliers s
    WHERE COALESCE(s.is_deleted,false) = false
      AND COALESCE(s.is_active,true) = true
      AND COALESCE(s.is_suspended,false) = false
      AND s.approval_status = 'approved'
      AND s.user_id IS NOT NULL
      AND (
        v_demand.category_id IS NULL
        OR s.categories IS NULL
        OR v_demand.category_id = ANY(s.categories)
      )
      AND (
        COALESCE(s.serves_all_country,false) = true
        OR (v_demand.city_id   IS NOT NULL AND EXISTS (SELECT 1 FROM public.supplier_cities  sc WHERE sc.supplier_id = s.id AND sc.city_id   = v_demand.city_id))
        OR (v_demand.region_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.supplier_regions sr WHERE sr.supplier_id = s.id AND sr.region_id = v_demand.region_id))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.demand_invitations di
        WHERE di.demand_id = _demand_id AND di.supplier_id = s.id
      )
  LOOP
    INSERT INTO public.demand_invitations (demand_id, supplier_id, status)
    VALUES (_demand_id, v_row.id, 'pending')
    RETURNING id INTO v_new_invite_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_row.user_id,
      'demand_invitation',
      'בקשת ביקוש חדשה באזור שלך',
      COALESCE('קטגוריה: ' || v_category_name || ' — ', '') || left(v_demand.description, 140),
      '/supplier/demand-inbox?demand_id=' || _demand_id::text,
      jsonb_build_object(
        'demand_id', _demand_id,
        'invitation_id', v_new_invite_id,
        'category_id', v_demand.category_id
      )
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  UPDATE public.demand_requests
    SET matched_count = matched_count + v_inserted,
        status = CASE WHEN v_inserted > 0 AND status = 'open' THEN 'matched' ELSE status END,
        updated_at = now()
    WHERE id = _demand_id;

  RETURN v_inserted;
END;
$$;
