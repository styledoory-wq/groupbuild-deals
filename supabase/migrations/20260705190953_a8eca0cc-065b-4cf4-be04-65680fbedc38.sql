
-- Extend demand_requests
ALTER TABLE public.demand_requests
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS admin_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participants_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_demand_requests_admin_status ON public.demand_requests(admin_status);
CREATE INDEX IF NOT EXISTS idx_demand_requests_deal_id ON public.demand_requests(deal_id);

-- Activity log
CREATE TABLE IF NOT EXISTS public.demand_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demand_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dal_demand_id ON public.demand_activity_log(demand_id, created_at DESC);
GRANT SELECT ON public.demand_activity_log TO authenticated;
GRANT ALL ON public.demand_activity_log TO service_role;
ALTER TABLE public.demand_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read demand activity" ON public.demand_activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- Participants
CREATE TABLE IF NOT EXISTS public.demand_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demand_requests(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  phone text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dp_demand_id ON public.demand_participants(demand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_participants TO authenticated;
GRANT ALL ON public.demand_participants TO service_role;
ALTER TABLE public.demand_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage demand participants" ON public.demand_participants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Demand owner reads participants" ON public.demand_participants
  FOR SELECT TO authenticated USING (public.is_resident_owner_of_demand(demand_id));

-- Messages
CREATE TABLE IF NOT EXISTS public.demand_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demand_requests(id) ON DELETE CASCADE,
  admin_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_demand_id ON public.demand_messages(demand_id, sent_at DESC);
GRANT SELECT ON public.demand_messages TO authenticated;
GRANT ALL ON public.demand_messages TO service_role;
ALTER TABLE public.demand_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read demand messages" ON public.demand_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- Allow admins to read all demand_requests + update admin fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demand_requests' AND policyname='Admins full access demand_requests') THEN
    CREATE POLICY "Admins full access demand_requests" ON public.demand_requests
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
  END IF;
END $$;

-- RPC: change status
CREATE OR REPLACE FUNCTION public.admin_change_demand_status(_demand_id uuid, _new_status text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old text; v_owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT admin_status, resident_user_id INTO v_old, v_owner FROM public.demand_requests WHERE id=_demand_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'demand_not_found'; END IF;

  UPDATE public.demand_requests
     SET admin_status = _new_status,
         first_reviewed_at = COALESCE(first_reviewed_at, CASE WHEN _new_status <> 'new' THEN now() END),
         closed_at = CASE WHEN _new_status IN ('closed','rejected') THEN now() ELSE closed_at END,
         updated_at = now()
   WHERE id = _demand_id;

  INSERT INTO public.demand_activity_log(demand_id, actor_id, action, payload)
  VALUES (_demand_id, auth.uid(), 'status_changed',
          jsonb_build_object('from', v_old, 'to', _new_status, 'note', _note));

  IF v_owner IS NOT NULL THEN
    PERFORM public.notify_user(v_owner, 'עדכון סטטוס בביקוש שלך',
      'סטטוס הביקוש עודכן ל: ' || _new_status, 'system', '/my-demand/' || _demand_id::text,
      jsonb_build_object('demand_id', _demand_id));
  END IF;
END; $$;

-- RPC: invite suppliers
CREATE OR REPLACE FUNCTION public.admin_invite_suppliers_to_demand(_demand_id uuid, _supplier_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0; v_sid uuid; v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  FOREACH v_sid IN ARRAY _supplier_ids LOOP
    INSERT INTO public.demand_invitations(demand_id, supplier_id, status)
    VALUES (_demand_id, v_sid, 'invited')
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;

    SELECT user_id INTO v_user FROM public.suppliers WHERE id = v_sid;
    IF v_user IS NOT NULL THEN
      PERFORM public.notify_user(v_user, 'הוזמנת לביקוש חדש',
        'קיבלת הזמנה להגיש הצעה על ביקוש דיירים', 'lead', '/supplier/demand-inbox',
        jsonb_build_object('demand_id', _demand_id));
    END IF;
  END LOOP;

  INSERT INTO public.demand_activity_log(demand_id, actor_id, action, payload)
  VALUES (_demand_id, auth.uid(), 'suppliers_invited',
          jsonb_build_object('count', v_count, 'supplier_ids', to_jsonb(_supplier_ids)));

  UPDATE public.demand_requests
    SET admin_status = CASE WHEN admin_status IN ('new','in_review','group_forming') THEN 'suppliers_invited' ELSE admin_status END,
        updated_at = now()
    WHERE id = _demand_id;

  RETURN v_count;
END; $$;

-- RPC: message participants
CREATE OR REPLACE FUNCTION public.admin_message_demand_participants(_demand_id uuid, _subject text, _body text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0; v_owner uuid; v_uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT resident_user_id INTO v_owner FROM public.demand_requests WHERE id=_demand_id;
  IF v_owner IS NOT NULL THEN
    PERFORM public.notify_user(v_owner, _subject, _body, 'system', '/my-demand/' || _demand_id::text);
    v_count := v_count + 1;
  END IF;
  FOR v_uid IN SELECT DISTINCT user_id FROM public.demand_participants WHERE demand_id=_demand_id AND user_id IS NOT NULL LOOP
    PERFORM public.notify_user(v_uid, _subject, _body, 'system', '/my-demand/' || _demand_id::text);
    v_count := v_count + 1;
  END LOOP;
  INSERT INTO public.demand_messages(demand_id, admin_id, subject, body, recipients_count)
  VALUES (_demand_id, auth.uid(), _subject, _body, v_count);
  INSERT INTO public.demand_activity_log(demand_id, actor_id, action, payload)
  VALUES (_demand_id, auth.uid(), 'message_sent', jsonb_build_object('recipients', v_count, 'subject', _subject));
  RETURN v_count;
END; $$;

-- RPC: convert to deal (creates draft; supplier assigned later via editor)
CREATE OR REPLACE FUNCTION public.admin_convert_demand_to_deal(_demand_id uuid, _supplier_id uuid, _title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deal_id uuid; v_dr public.demand_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO v_dr FROM public.demand_requests WHERE id=_demand_id;
  IF v_dr.id IS NULL THEN RAISE EXCEPTION 'demand_not_found'; END IF;

  INSERT INTO public.deals(supplier_id, title, description, category_id, project_id, original_price, status, listing_type, offer_type, target_participants)
  VALUES (_supplier_id, _title, v_dr.description, v_dr.category_id, v_dr.project_id, COALESCE(v_dr.budget_max, 0), 'draft', 'group_buy', 'percentage', COALESCE(v_dr.target_qty, v_dr.participants_count))
  RETURNING id INTO v_deal_id;

  UPDATE public.demand_requests
    SET deal_id = v_deal_id, admin_status = 'offer_published', updated_at = now()
    WHERE id = _demand_id;

  INSERT INTO public.demand_activity_log(demand_id, actor_id, action, payload)
  VALUES (_demand_id, auth.uid(), 'deal_created', jsonb_build_object('deal_id', v_deal_id, 'supplier_id', _supplier_id));

  IF v_dr.resident_user_id IS NOT NULL THEN
    PERFORM public.notify_user(v_dr.resident_user_id, 'הצעה נוצרה מהביקוש שלך',
      'צוות הפלטפורמה יצר הצעה מהביקוש שהגשת.', 'deal', '/deal/' || v_deal_id::text,
      jsonb_build_object('demand_id', _demand_id, 'deal_id', v_deal_id));
  END IF;

  RETURN v_deal_id;
END; $$;

-- RPC: close
CREATE OR REPLACE FUNCTION public.admin_close_demand(_demand_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  UPDATE public.demand_requests
    SET admin_status = 'closed', closed_at = now(), updated_at = now(),
        admin_notes = COALESCE(admin_notes,'') || CASE WHEN _reason IS NOT NULL THEN E'\n[סגירה] ' || _reason ELSE '' END
    WHERE id = _demand_id;
  INSERT INTO public.demand_activity_log(demand_id, actor_id, action, payload)
  VALUES (_demand_id, auth.uid(), 'closed', jsonb_build_object('reason', _reason));
END; $$;

-- KPIs
CREATE OR REPLACE FUNCTION public.get_admin_demand_kpis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT jsonb_build_object(
    'new_count', COUNT(*) FILTER (WHERE admin_status='new'),
    'open_count', COUNT(*) FILTER (WHERE admin_status NOT IN ('closed','rejected','offer_published')),
    'converted_count', COUNT(*) FILTER (WHERE deal_id IS NOT NULL),
    'total_count', COUNT(*),
    'conversion_rate', CASE WHEN COUNT(*)>0 THEN ROUND((COUNT(*) FILTER (WHERE deal_id IS NOT NULL))::numeric*100/COUNT(*), 1) ELSE 0 END,
    'avg_handling_hours', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (first_reviewed_at - created_at))/3600)::numeric, 1), 0)
  ) INTO v FROM public.demand_requests;
  RETURN v;
END; $$;
