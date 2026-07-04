
-- Block viewers from inserting rows into shared project tables.
-- Existing per-user "insert own row" policies restrict user_id to auth.uid();
-- we add an extra CHECK that the caller must be owner/partner (or have no
-- project yet — new users pre-first-project keep working).

CREATE OR REPLACE FUNCTION public.viewer_insert_allowed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_project_members
    WHERE user_id = _user_id
      AND role = 'viewer'::user_project_role
  );
$$;

-- Favorites
DROP POLICY IF EXISTS "favorites_no_viewer_insert" ON public.favorites;
CREATE POLICY "favorites_no_viewer_insert" ON public.favorites AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.viewer_insert_allowed(auth.uid()));

-- Supplier inquiries
DROP POLICY IF EXISTS "supplier_inquiries_no_viewer_insert" ON public.supplier_inquiries;
CREATE POLICY "supplier_inquiries_no_viewer_insert" ON public.supplier_inquiries AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.viewer_insert_allowed(auth.uid()));

-- Documents
DROP POLICY IF EXISTS "documents_no_viewer_insert" ON public.documents;
CREATE POLICY "documents_no_viewer_insert" ON public.documents AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.viewer_insert_allowed(auth.uid()));

-- Deal interests
DROP POLICY IF EXISTS "deal_interests_no_viewer_insert" ON public.deal_interests;
CREATE POLICY "deal_interests_no_viewer_insert" ON public.deal_interests AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.viewer_insert_allowed(auth.uid()));

-- Deposits (residents create these when joining a deal)
DROP POLICY IF EXISTS "deposits_no_viewer_insert" ON public.deposits;
CREATE POLICY "deposits_no_viewer_insert" ON public.deposits AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    public.viewer_insert_allowed(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
