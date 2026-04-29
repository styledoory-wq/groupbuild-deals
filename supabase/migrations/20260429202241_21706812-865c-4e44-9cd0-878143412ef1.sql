-- Add deposit_required to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false;

-- Add deposit fields to deal_interests
ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none';

-- Allow suppliers to view interests on their own deals (so SupplierLeads works)
DROP POLICY IF EXISTS "Suppliers view interests on own deals" ON public.deal_interests;
CREATE POLICY "Suppliers view interests on own deals"
  ON public.deal_interests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.suppliers s ON s.id = d.supplier_id
      WHERE d.id::text = deal_interests.deal_id
        AND (s.user_id = auth.uid()
             OR lower(COALESCE(s.email,'')) = lower(COALESCE(auth.jwt()->>'email','')))
    )
  );

-- Public count function (so residents see how many joined without seeing PII)
CREATE OR REPLACE FUNCTION public.get_deal_interest_count(_deal_id text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::int
  FROM public.deal_interests
  WHERE deal_id = _deal_id
    AND status IN ('interested','committed','paid')
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_interest_count(text) TO anon, authenticated;
