
-- ============================================================================
-- Project-wide sharing: add project_id + shared RLS to 7 user-scoped tables
-- ============================================================================

-- Helper: return the caller's primary project (first membership)
CREATE OR REPLACE FUNCTION public.user_primary_project_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM public.user_project_members
   WHERE user_id = _user_id
   ORDER BY joined_at ASC
   LIMIT 1;
$$;

-- Helper: is caller a member of the project (any role)
CREATE OR REPLACE FUNCTION public.is_user_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_project_members
    WHERE project_id = _project_id AND user_id = _user_id
  );
$$;

-- Helper: can the caller edit shared project rows (owner/partner only)
CREATE OR REPLACE FUNCTION public.can_edit_user_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_project_members
    WHERE project_id = _project_id AND user_id = _user_id
      AND role IN ('owner'::user_project_role, 'partner'::user_project_role)
  );
$$;

-- Generic trigger: auto-fill project_id on INSERT from inserting user's primary project
CREATE OR REPLACE FUNCTION public.autofill_project_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.project_id := public.user_primary_project_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Apply to each user-scoped table: column + backfill + index + trigger + RLS
-- ============================================================================

-- ---------- favorites ----------
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.favorites f SET project_id = public.user_primary_project_id(f.user_id)
 WHERE f.project_id IS NULL AND f.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_project_id ON public.favorites(project_id);
DROP TRIGGER IF EXISTS trg_favorites_autofill_project ON public.favorites;
CREATE TRIGGER trg_favorites_autofill_project BEFORE INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "favorites_member_select" ON public.favorites;
CREATE POLICY "favorites_member_select" ON public.favorites FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));
DROP POLICY IF EXISTS "favorites_member_delete" ON public.favorites;
CREATE POLICY "favorites_member_delete" ON public.favorites FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));

-- ---------- supplier_inquiries ----------
ALTER TABLE public.supplier_inquiries ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.supplier_inquiries q SET project_id = public.user_primary_project_id(q.user_id)
 WHERE q.project_id IS NULL AND q.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_project_id ON public.supplier_inquiries(project_id);
DROP TRIGGER IF EXISTS trg_supplier_inquiries_autofill_project ON public.supplier_inquiries;
CREATE TRIGGER trg_supplier_inquiries_autofill_project BEFORE INSERT ON public.supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "supplier_inquiries_member_select" ON public.supplier_inquiries;
CREATE POLICY "supplier_inquiries_member_select" ON public.supplier_inquiries FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));
DROP POLICY IF EXISTS "supplier_inquiries_member_update" ON public.supplier_inquiries;
CREATE POLICY "supplier_inquiries_member_update" ON public.supplier_inquiries FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()))
  WITH CHECK (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));

-- ---------- documents ----------
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.documents d SET project_id = public.user_primary_project_id(d.user_id)
 WHERE d.project_id IS NULL AND d.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
DROP TRIGGER IF EXISTS trg_documents_autofill_project ON public.documents;
CREATE TRIGGER trg_documents_autofill_project BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "documents_member_select" ON public.documents;
CREATE POLICY "documents_member_select" ON public.documents FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));
DROP POLICY IF EXISTS "documents_member_update" ON public.documents;
CREATE POLICY "documents_member_update" ON public.documents FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()))
  WITH CHECK (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));
DROP POLICY IF EXISTS "documents_member_delete" ON public.documents;
CREATE POLICY "documents_member_delete" ON public.documents FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));

-- ---------- notifications ----------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.notifications n SET project_id = public.user_primary_project_id(n.user_id)
 WHERE n.project_id IS NULL AND n.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON public.notifications(project_id);
DROP TRIGGER IF EXISTS trg_notifications_autofill_project ON public.notifications;
CREATE TRIGGER trg_notifications_autofill_project BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "notifications_member_select" ON public.notifications;
CREATE POLICY "notifications_member_select" ON public.notifications FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));
-- Update (mark as read) allowed for any member on shared notifications
DROP POLICY IF EXISTS "notifications_member_update" ON public.notifications;
CREATE POLICY "notifications_member_update" ON public.notifications FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()))
  WITH CHECK (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));

-- ---------- deal_interests ----------
ALTER TABLE public.deal_interests ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.deal_interests i SET project_id = public.user_primary_project_id(i.user_id)
 WHERE i.project_id IS NULL AND i.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_interests_project_id ON public.deal_interests(project_id);
DROP TRIGGER IF EXISTS trg_deal_interests_autofill_project ON public.deal_interests;
CREATE TRIGGER trg_deal_interests_autofill_project BEFORE INSERT ON public.deal_interests
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "deal_interests_member_select" ON public.deal_interests;
CREATE POLICY "deal_interests_member_select" ON public.deal_interests FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));
DROP POLICY IF EXISTS "deal_interests_member_update" ON public.deal_interests;
CREATE POLICY "deal_interests_member_update" ON public.deal_interests FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()))
  WITH CHECK (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));
DROP POLICY IF EXISTS "deal_interests_member_delete" ON public.deal_interests;
CREATE POLICY "deal_interests_member_delete" ON public.deal_interests FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.can_edit_user_project(project_id, auth.uid()));

-- ---------- deposits ----------
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.deposits d SET project_id = public.user_primary_project_id(d.user_id)
 WHERE d.project_id IS NULL AND d.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_project_id ON public.deposits(project_id);
DROP TRIGGER IF EXISTS trg_deposits_autofill_project ON public.deposits;
CREATE TRIGGER trg_deposits_autofill_project BEFORE INSERT ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "deposits_member_select" ON public.deposits;
CREATE POLICY "deposits_member_select" ON public.deposits FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));

-- ---------- vouchers ----------
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;
UPDATE public.vouchers v SET project_id = public.user_primary_project_id(v.user_id)
 WHERE v.project_id IS NULL AND v.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_project_id ON public.vouchers(project_id);
DROP TRIGGER IF EXISTS trg_vouchers_autofill_project ON public.vouchers;
CREATE TRIGGER trg_vouchers_autofill_project BEFORE INSERT ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.autofill_project_id();
DROP POLICY IF EXISTS "vouchers_member_select" ON public.vouchers;
CREATE POLICY "vouchers_member_select" ON public.vouchers FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_user_project_member(project_id, auth.uid()));

-- ============================================================================
-- Also: when a new project member joins, backfill THEIR existing user rows
-- with the project_id so the new member's history shows up for partners.
-- (For invitations acceptance flow.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backfill_member_project_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.favorites          SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.supplier_inquiries SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.documents          SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.notifications      SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.deal_interests     SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.deposits           SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  UPDATE public.vouchers           SET project_id = NEW.project_id WHERE user_id = NEW.user_id AND project_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_member_project_id ON public.user_project_members;
CREATE TRIGGER trg_backfill_member_project_id AFTER INSERT ON public.user_project_members
  FOR EACH ROW EXECUTE FUNCTION public.backfill_member_project_id();
