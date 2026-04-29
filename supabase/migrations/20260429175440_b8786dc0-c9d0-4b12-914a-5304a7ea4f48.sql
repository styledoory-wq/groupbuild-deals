
-- Create deals table for supplier offers
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id text,
  project_id text,
  original_price numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  ends_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_supplier_id ON public.deals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Public can view active deals from approved suppliers
CREATE POLICY "Public can view active deals"
  ON public.deals FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = deals.supplier_id
        AND s.is_active = true
        AND s.approval_status IN ('approved','active')
    )
  );

-- Suppliers manage their own deals (by user_id)
CREATE POLICY "Suppliers view own deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.suppliers s
            WHERE s.id = deals.supplier_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Suppliers insert own deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.suppliers s
            WHERE s.id = deals.supplier_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Suppliers update own deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.suppliers s
            WHERE s.id = deals.supplier_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.suppliers s
            WHERE s.id = deals.supplier_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Suppliers delete own deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.suppliers s
            WHERE s.id = deals.supplier_id AND s.user_id = auth.uid())
  );

-- Admins manage all deals
CREATE POLICY "Admins manage all deals"
  ON public.deals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS deals_set_updated_at ON public.deals;
CREATE TRIGGER deals_set_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
