CREATE OR REPLACE FUNCTION public.ensure_user_project()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_project uuid;
  v_full_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT project_id
    INTO v_project
  FROM public.user_project_members
  WHERE user_id = v_user
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_project IS NOT NULL THEN
    RETURN v_project;
  END IF;

  SELECT full_name
    INTO v_full_name
  FROM public.profiles
  WHERE id = v_user
  LIMIT 1;

  INSERT INTO public.user_projects (name, project_type, created_by)
  VALUES (
    COALESCE(NULLIF(v_full_name, ''), 'הפרויקט שלי'),
    NULL,
    v_user
  )
  RETURNING id INTO v_project;

  INSERT INTO public.user_project_members (project_id, user_id, role)
  VALUES (v_project, v_user, 'owner')
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner';

  INSERT INTO public.user_project_data (project_id)
  VALUES (v_project)
  ON CONFLICT (project_id) DO NOTHING;

  RETURN v_project;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_project() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_project() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_project() TO authenticated;