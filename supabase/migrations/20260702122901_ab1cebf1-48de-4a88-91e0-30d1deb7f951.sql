
-- Helper: is the current user a supplier invited to a given demand?
CREATE OR REPLACE FUNCTION public.is_supplier_invited_to_demand(_demand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM demand_invitations di
    JOIN suppliers s ON s.id = di.supplier_id
    WHERE di.demand_id = _demand_id
      AND s.user_id = auth.uid()
  );
$$;

-- Helper: is the current user the resident who owns a given demand?
CREATE OR REPLACE FUNCTION public.is_resident_owner_of_demand(_demand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM demand_requests dr
    WHERE dr.id = _demand_id AND dr.resident_user_id = auth.uid()
  );
$$;

-- Rewrite recursive policies
DROP POLICY IF EXISTS suppliers_view_invited_demand ON public.demand_requests;
CREATE POLICY suppliers_view_invited_demand
  ON public.demand_requests
  FOR SELECT
  USING (public.is_supplier_invited_to_demand(id));

DROP POLICY IF EXISTS resident_reads_invitations_for_own_demand ON public.demand_invitations;
CREATE POLICY resident_reads_invitations_for_own_demand
  ON public.demand_invitations
  FOR SELECT
  USING (public.is_resident_owner_of_demand(demand_id));
