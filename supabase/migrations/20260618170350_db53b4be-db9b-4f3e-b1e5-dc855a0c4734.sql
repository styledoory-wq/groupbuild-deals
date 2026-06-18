
CREATE OR REPLACE FUNCTION public.admin_revoke_committee_role(_user_id uuid, _project_id text DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = _user_id AND role = 'committee'::app_role;

  UPDATE public.committee_requests
     SET status = 'rejected',
         decided_by = auth.uid(),
         decided_at = now(),
         decision_notes = COALESCE(_reason, 'ההרשאה בוטלה ע"י אדמין'),
         updated_at = now()
   WHERE user_id = _user_id
     AND status = 'approved'
     AND (_project_id IS NULL OR project_id = _project_id);

  PERFORM public.notify_user(
    _user_id,
    'הרשאת ועד בית בוטלה',
    COALESCE('סיבה: ' || _reason, 'הרשאת ועד הבית שלך בוטלה.'),
    'system',
    '/'
  );
END;
$$;
