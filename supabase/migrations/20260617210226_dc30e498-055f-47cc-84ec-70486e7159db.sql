
CREATE TABLE IF NOT EXISTS public.committee_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS committee_requests_user_idx ON public.committee_requests(user_id);
CREATE INDEX IF NOT EXISTS committee_requests_project_idx ON public.committee_requests(project_id);
CREATE INDEX IF NOT EXISTS committee_requests_status_idx ON public.committee_requests(status);

GRANT SELECT, INSERT ON public.committee_requests TO authenticated;
GRANT ALL ON public.committee_requests TO service_role;

ALTER TABLE public.committee_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own committee requests"
ON public.committee_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own committee requests"
ON public.committee_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update committee requests"
ON public.committee_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER committee_requests_updated_at
BEFORE UPDATE ON public.committee_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper
CREATE OR REPLACE FUNCTION public.is_committee_for_project(_project_id TEXT, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'committee'::app_role
      AND p.project_id = _project_id
  );
$$;

-- RPC: submit request
CREATE OR REPLACE FUNCTION public.request_committee_role(_project_id TEXT, _notes TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _project_id IS NULL OR _project_id = '' THEN RAISE EXCEPTION 'project_required'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.committee_requests
    WHERE user_id = auth.uid() AND project_id = _project_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'request_already_pending';
  END IF;

  INSERT INTO public.committee_requests (user_id, project_id, notes)
  VALUES (auth.uid(), _project_id, _notes)
  RETURNING id INTO v_id;

  PERFORM public.notify_admins(
    'בקשת ועד בית חדשה',
    'משתמש ביקש הרשאת ועד בית לפרויקט: ' || _project_id,
    'system',
    '/admin/committee-requests',
    jsonb_build_object('request_id', v_id, 'project_id', _project_id)
  );

  RETURN v_id;
END;
$$;

-- RPC: admin decision
CREATE OR REPLACE FUNCTION public.admin_decide_committee_request(_id UUID, _approve BOOLEAN, _notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req public.committee_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_req FROM public.committee_requests WHERE id = _id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_decided'; END IF;

  UPDATE public.committee_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      decided_by = auth.uid(),
      decided_at = now(),
      decision_notes = _notes,
      updated_at = now()
  WHERE id = _id;

  IF _approve THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_req.user_id, 'committee'::app_role)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
    SET project_id = v_req.project_id, updated_at = now()
    WHERE id = v_req.user_id AND (project_id IS NULL OR project_id = '');

    PERFORM public.notify_user(
      v_req.user_id,
      'הבקשה לוועד בית אושרה',
      'קיבלת הרשאת ועד בית. כעת תוכל ליזום עסקאות לבניין.',
      'system',
      '/committee'
    );
  ELSE
    PERFORM public.notify_user(
      v_req.user_id,
      'הבקשה לוועד בית נדחתה',
      COALESCE('סיבה: ' || _notes, 'הבקשה נדחתה.'),
      'system',
      '/committee/request'
    );
  END IF;
END;
$$;

-- RPC: committee dashboard stats
CREATE OR REPLACE FUNCTION public.get_committee_dashboard(_project_id TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pid TEXT;
  v_active_deals INT;
  v_joiners INT;
  v_savings NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  v_pid := COALESCE(_project_id, (SELECT project_id FROM public.profiles WHERE id = auth.uid()));
  IF v_pid IS NULL OR v_pid = '' THEN
    RETURN jsonb_build_object('project_id', NULL, 'active_deals', 0, 'joiners', 0, 'savings', 0);
  END IF;

  SELECT COUNT(*)::int INTO v_active_deals
  FROM public.deals d
  WHERE d.status = 'active' AND COALESCE(d.is_deleted,false) = false;

  SELECT COUNT(DISTINCT di.user_id)::int INTO v_joiners
  FROM public.deal_interests di
  JOIN public.profiles p ON p.id = di.user_id
  WHERE p.project_id = v_pid AND COALESCE(di.is_deleted,false) = false;

  SELECT COALESCE(SUM(GREATEST(d.original_price - COALESCE(d.discounted_price, d.original_price), 0)),0)::numeric
    INTO v_savings
  FROM public.deposits dep
  JOIN public.profiles p ON p.id = dep.user_id
  JOIN public.deals d ON d.id::text = dep.deal_id
  WHERE p.project_id = v_pid AND dep.status = 'paid' AND COALESCE(dep.is_deleted,false) = false;

  RETURN jsonb_build_object(
    'project_id', v_pid,
    'active_deals', v_active_deals,
    'joiners', v_joiners,
    'savings', v_savings
  );
END;
$$;
