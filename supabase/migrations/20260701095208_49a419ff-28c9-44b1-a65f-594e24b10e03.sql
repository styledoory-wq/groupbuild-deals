
-- 1) Tables (create both before policies)
CREATE TABLE public.demand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_user_id uuid NOT NULL,
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  description text NOT NULL,
  target_qty integer,
  budget_min numeric,
  budget_max numeric,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','closed','expired')),
  matched_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.demand_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demand_requests(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','viewed','interested','declined','submitted_offer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  offer_deal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demand_id, supplier_id)
);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_requests    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_invitations TO authenticated;
GRANT ALL ON public.demand_requests    TO service_role;
GRANT ALL ON public.demand_invitations TO service_role;

-- 3) RLS
ALTER TABLE public.demand_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_invitations ENABLE ROW LEVEL SECURITY;

-- 4) Indexes
CREATE INDEX idx_demand_requests_resident ON public.demand_requests(resident_user_id);
CREATE INDEX idx_demand_requests_status   ON public.demand_requests(status);
CREATE INDEX idx_demand_requests_city     ON public.demand_requests(city_id);
CREATE INDEX idx_demand_requests_region   ON public.demand_requests(region_id);
CREATE INDEX idx_demand_requests_category ON public.demand_requests(category_id);
CREATE INDEX idx_demand_invites_demand    ON public.demand_invitations(demand_id);
CREATE INDEX idx_demand_invites_supplier  ON public.demand_invitations(supplier_id);
CREATE INDEX idx_demand_invites_status    ON public.demand_invitations(status);

-- 5) Policies: demand_requests
CREATE POLICY "residents_manage_own_demand"
  ON public.demand_requests FOR ALL
  USING (resident_user_id = auth.uid())
  WITH CHECK (resident_user_id = auth.uid());

CREATE POLICY "admins_manage_all_demand"
  ON public.demand_requests FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "suppliers_view_invited_demand"
  ON public.demand_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demand_invitations di
    JOIN public.suppliers s ON s.id = di.supplier_id
    WHERE di.demand_id = demand_requests.id
      AND s.user_id = auth.uid()
  ));

-- 6) Policies: demand_invitations
CREATE POLICY "supplier_reads_own_invitations"
  ON public.demand_invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = demand_invitations.supplier_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_updates_own_invitation"
  ON public.demand_invitations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = demand_invitations.supplier_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = demand_invitations.supplier_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "resident_reads_invitations_for_own_demand"
  ON public.demand_invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.demand_requests dr
    WHERE dr.id = demand_invitations.demand_id AND dr.resident_user_id = auth.uid()
  ));

CREATE POLICY "admins_manage_all_invitations"
  ON public.demand_invitations FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 7) updated_at triggers
CREATE TRIGGER trg_demand_requests_updated
  BEFORE UPDATE ON public.demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_demand_invitations_updated
  BEFORE UPDATE ON public.demand_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Matching RPC
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
      '/supplier/demand/' || _demand_id::text,
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

GRANT EXECUTE ON FUNCTION public.match_suppliers_for_demand(uuid) TO authenticated, service_role;

-- 9) Auto-match trigger
CREATE OR REPLACE FUNCTION public.trg_demand_request_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.match_suppliers_for_demand(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demand_requests_auto_match
  AFTER INSERT ON public.demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_demand_request_after_insert();
