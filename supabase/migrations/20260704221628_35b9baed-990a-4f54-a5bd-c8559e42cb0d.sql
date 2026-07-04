-- Project Members MVP
-- 1) Enum for member roles
DO $$ BEGIN
  CREATE TYPE public.user_project_role AS ENUM ('owner','partner','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Personal/shared projects (distinct from the buildings "projects" table)
CREATE TABLE IF NOT EXISTS public.user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'הפרויקט שלי',
  project_type text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_projects TO authenticated;
GRANT ALL ON public.user_projects TO service_role;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- 3) Members
CREATE TABLE IF NOT EXISTS public.user_project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.user_project_role NOT NULL DEFAULT 'partner',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_project_members TO authenticated;
GRANT ALL ON public.user_project_members TO service_role;
ALTER TABLE public.user_project_members ENABLE ROW LEVEL SECURITY;

-- 4) Invitations (link based)
CREATE TABLE IF NOT EXISTS public.user_project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  role public.user_project_role NOT NULL DEFAULT 'partner',
  invited_by uuid NOT NULL,
  invited_email text,
  invited_phone text,
  accepted_at timestamptz,
  accepted_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_project_invitations TO authenticated;
GRANT ALL ON public.user_project_invitations TO service_role;
ALTER TABLE public.user_project_invitations ENABLE ROW LEVEL SECURITY;

-- 5) Shared project data (single row per project, jsonb blob)
CREATE TABLE IF NOT EXISTS public.user_project_data (
  project_id uuid PRIMARY KEY REFERENCES public.user_projects(id) ON DELETE CASCADE,
  info jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  tasks jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_total numeric NOT NULL DEFAULT 0,
  current_idx int NOT NULL DEFAULT 0,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_project_data TO authenticated;
GRANT ALL ON public.user_project_data TO service_role;
ALTER TABLE public.user_project_data ENABLE ROW LEVEL SECURITY;

-- 6) Membership check (SECURITY DEFINER — avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_user_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_project_members
    WHERE project_id = _project_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_project_role_of(_project_id uuid, _user_id uuid)
RETURNS public.user_project_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT role FROM public.user_project_members
  WHERE project_id = _project_id AND user_id = _user_id LIMIT 1;
$$;

-- 7) Policies
-- user_projects: members can read; owners can update/delete
DROP POLICY IF EXISTS "up_select_members" ON public.user_projects;
CREATE POLICY "up_select_members" ON public.user_projects FOR SELECT TO authenticated
  USING (public.is_user_project_member(id, auth.uid()));

DROP POLICY IF EXISTS "up_insert_self" ON public.user_projects;
CREATE POLICY "up_insert_self" ON public.user_projects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "up_update_owner" ON public.user_projects;
CREATE POLICY "up_update_owner" ON public.user_projects FOR UPDATE TO authenticated
  USING (public.user_project_role_of(id, auth.uid()) IN ('owner','partner'))
  WITH CHECK (public.user_project_role_of(id, auth.uid()) IN ('owner','partner'));

DROP POLICY IF EXISTS "up_delete_owner" ON public.user_projects;
CREATE POLICY "up_delete_owner" ON public.user_projects FOR DELETE TO authenticated
  USING (public.user_project_role_of(id, auth.uid()) = 'owner');

-- members: any member can read; owner can insert/delete/update; user can insert themselves via accept RPC (bypasses RLS)
DROP POLICY IF EXISTS "upm_select_members" ON public.user_project_members;
CREATE POLICY "upm_select_members" ON public.user_project_members FOR SELECT TO authenticated
  USING (public.is_user_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "upm_insert_owner" ON public.user_project_members;
CREATE POLICY "upm_insert_owner" ON public.user_project_members FOR INSERT TO authenticated
  WITH CHECK (
    -- initial owner insert (creator adds themselves) OR owner adds others
    (user_id = auth.uid() AND NOT public.is_user_project_member(project_id, auth.uid()))
    OR public.user_project_role_of(project_id, auth.uid()) = 'owner'
  );

DROP POLICY IF EXISTS "upm_update_owner" ON public.user_project_members;
CREATE POLICY "upm_update_owner" ON public.user_project_members FOR UPDATE TO authenticated
  USING (public.user_project_role_of(project_id, auth.uid()) = 'owner');

DROP POLICY IF EXISTS "upm_delete_self_or_owner" ON public.user_project_members;
CREATE POLICY "upm_delete_self_or_owner" ON public.user_project_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.user_project_role_of(project_id, auth.uid()) = 'owner');

-- invitations: members can read; owner/partner can create; token-based accept via RPC
DROP POLICY IF EXISTS "upi_select_members" ON public.user_project_invitations;
CREATE POLICY "upi_select_members" ON public.user_project_invitations FOR SELECT TO authenticated
  USING (public.is_user_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "upi_insert_owner_partner" ON public.user_project_invitations;
CREATE POLICY "upi_insert_owner_partner" ON public.user_project_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.user_project_role_of(project_id, auth.uid()) IN ('owner','partner')
  );

DROP POLICY IF EXISTS "upi_delete_owner" ON public.user_project_invitations;
CREATE POLICY "upi_delete_owner" ON public.user_project_invitations FOR DELETE TO authenticated
  USING (public.user_project_role_of(project_id, auth.uid()) = 'owner');

-- data: members read; partner/owner write
DROP POLICY IF EXISTS "upd_select_members" ON public.user_project_data;
CREATE POLICY "upd_select_members" ON public.user_project_data FOR SELECT TO authenticated
  USING (public.is_user_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "upd_insert_members" ON public.user_project_data;
CREATE POLICY "upd_insert_members" ON public.user_project_data FOR INSERT TO authenticated
  WITH CHECK (public.user_project_role_of(project_id, auth.uid()) IN ('owner','partner'));

DROP POLICY IF EXISTS "upd_update_members" ON public.user_project_data;
CREATE POLICY "upd_update_members" ON public.user_project_data FOR UPDATE TO authenticated
  USING (public.user_project_role_of(project_id, auth.uid()) IN ('owner','partner'))
  WITH CHECK (public.user_project_role_of(project_id, auth.uid()) IN ('owner','partner'));

-- 8) Trigger to auto-create data row & make creator owner
CREATE OR REPLACE FUNCTION public.after_user_project_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.user_project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_project_data (project_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_after_user_project_created ON public.user_projects;
CREATE TRIGGER trg_after_user_project_created
AFTER INSERT ON public.user_projects
FOR EACH ROW EXECUTE FUNCTION public.after_user_project_created();

-- 9) updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_user_project_data()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); NEW.updated_by = auth.uid(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_touch_upd ON public.user_project_data;
CREATE TRIGGER trg_touch_upd BEFORE UPDATE ON public.user_project_data
FOR EACH ROW EXECUTE FUNCTION public.touch_user_project_data();

DROP TRIGGER IF EXISTS trg_touch_up ON public.user_projects;
CREATE TRIGGER trg_touch_up BEFORE UPDATE ON public.user_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) Accept invitation RPC
CREATE OR REPLACE FUNCTION public.accept_user_project_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_inv public.user_project_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_inv FROM public.user_project_invitations WHERE token = _token LIMIT 1;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'invitation_expired'; END IF;

  INSERT INTO public.user_project_members (project_id, user_id, role)
  VALUES (v_inv.project_id, auth.uid(), v_inv.role)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  IF v_inv.accepted_at IS NULL THEN
    UPDATE public.user_project_invitations
      SET accepted_at = now(), accepted_by = auth.uid()
      WHERE id = v_inv.id;
  END IF;

  RETURN v_inv.project_id;
END; $$;

-- 11) Transfer ownership
CREATE OR REPLACE FUNCTION public.transfer_user_project_ownership(_project_id uuid, _to_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.user_project_role_of(_project_id, auth.uid()) <> 'owner' THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF NOT public.is_user_project_member(_project_id, _to_user) THEN
    RAISE EXCEPTION 'target_not_member';
  END IF;
  UPDATE public.user_project_members SET role='partner' WHERE project_id=_project_id AND user_id=auth.uid();
  UPDATE public.user_project_members SET role='owner'   WHERE project_id=_project_id AND user_id=_to_user;
END; $$;

-- 12) Realtime
ALTER TABLE public.user_projects REPLICA IDENTITY FULL;
ALTER TABLE public.user_project_members REPLICA IDENTITY FULL;
ALTER TABLE public.user_project_data REPLICA IDENTITY FULL;
ALTER TABLE public.user_project_invitations REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_projects;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_project_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_project_data;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_project_invitations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
