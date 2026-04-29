-- Reviews table for automatic ratings
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  deal_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deal_id)
);

CREATE INDEX idx_reviews_supplier ON public.reviews(supplier_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can read reviews — they're public social proof
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Only residents who paid into a deal AND the deal is completed can insert
-- "completed" deal status is tracked client-side / by admin; we validate via deposits paid
CREATE OR REPLACE FUNCTION public.user_can_review(_user_id uuid, _deal_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deposits
    WHERE user_id = _user_id
      AND deal_id = _deal_id
      AND status = 'paid'
  )
$$;

CREATE POLICY "Participants can insert their review"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_review(auth.uid(), deal_id));

CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Aggregate functions used by the UI to compute live stats
CREATE OR REPLACE FUNCTION public.get_supplier_rating(_supplier_id uuid)
RETURNS TABLE(avg_rating numeric, review_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
    COUNT(*)::int AS review_count
  FROM public.reviews
  WHERE supplier_id = _supplier_id
$$;