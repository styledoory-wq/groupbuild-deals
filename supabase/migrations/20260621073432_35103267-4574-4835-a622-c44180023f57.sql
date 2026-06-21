CREATE TABLE public.deal_marketing_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  headline text,
  subheadline text,
  cta text,
  urgency_tag text,
  recommended_template text,
  enhanced_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_marketing_ai TO authenticated;
GRANT ALL ON public.deal_marketing_ai TO service_role;

ALTER TABLE public.deal_marketing_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view AI marketing for their deals"
ON public.deal_marketing_ai FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = deal_marketing_ai.deal_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can insert AI marketing for their deals"
ON public.deal_marketing_ai FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = deal_marketing_ai.deal_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can update AI marketing for their deals"
ON public.deal_marketing_ai FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = deal_marketing_ai.deal_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can delete AI marketing for their deals"
ON public.deal_marketing_ai FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = deal_marketing_ai.deal_id AND s.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.touch_deal_marketing_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_deal_marketing_ai_updated_at
BEFORE UPDATE ON public.deal_marketing_ai
FOR EACH ROW EXECUTE FUNCTION public.touch_deal_marketing_ai_updated_at();