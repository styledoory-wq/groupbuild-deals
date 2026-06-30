
-- Add listing_type to deals: 'group_buy' (default, existing behavior) or 'regular' (no tiers, simple offer)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'group_buy';

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_listing_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_listing_type_check
  CHECK (listing_type IN ('group_buy','regular'));

-- Existing deals stay 'group_buy' (already the default).

-- Table for "request a group buy" interest on regular offers.
CREATE TABLE IF NOT EXISTS public.group_buy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_buy_requests_deal ON public.group_buy_requests(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_buy_requests_user ON public.group_buy_requests(user_id);

GRANT SELECT, INSERT ON public.group_buy_requests TO authenticated;
GRANT ALL ON public.group_buy_requests TO service_role;

ALTER TABLE public.group_buy_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users view own group buy requests"
  ON public.group_buy_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Supplier (owner of the deal) can see requests for their deals
CREATE POLICY "Suppliers view requests for own deals"
  ON public.group_buy_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.suppliers s ON s.id = d.supplier_id
    WHERE d.id = group_buy_requests.deal_id AND s.user_id = auth.uid()
  ));

-- Admins manage all
CREATE POLICY "Admins manage all group buy requests"
  ON public.group_buy_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert is done via SECURITY DEFINER RPC, so no public INSERT policy needed.
-- (Defense in depth: explicit insert by users disallowed unless via the function.)

-- RPC: request a group buy. Inserts request + supplier notification.
CREATE OR REPLACE FUNCTION public.request_group_buy(
  _deal_id uuid,
  _full_name text,
  _phone text,
  _message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_supplier_user uuid;
  v_deal_title text;
  v_count int;
  v_req_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name required';
  END IF;
  IF _phone IS NULL OR length(trim(_phone)) = 0 THEN
    RAISE EXCEPTION 'phone required';
  END IF;

  SELECT s.user_id, d.title
    INTO v_supplier_user, v_deal_title
  FROM deals d
  JOIN suppliers s ON s.id = d.supplier_id
  WHERE d.id = _deal_id;

  IF v_deal_title IS NULL THEN
    RAISE EXCEPTION 'deal not found';
  END IF;

  INSERT INTO group_buy_requests(deal_id, user_id, full_name, phone, message)
  VALUES (_deal_id, v_user_id, trim(_full_name), trim(_phone), NULLIF(trim(coalesce(_message,'')), ''))
  RETURNING id INTO v_req_id;

  SELECT count(*) INTO v_count FROM group_buy_requests WHERE deal_id = _deal_id;

  IF v_supplier_user IS NOT NULL THEN
    INSERT INTO notifications(user_id, type, title, body, link, metadata)
    VALUES (
      v_supplier_user,
      'lead',
      'בקשה לפתיחת קבוצת רכישה',
      format('דייר ביקש לפתוח קבוצת רכישה עבור "%s" (%s מתעניינים סה"כ)', v_deal_title, v_count),
      '/supplier/offers',
      jsonb_build_object('deal_id', _deal_id, 'kind', 'group_buy_request', 'request_id', v_req_id, 'count', v_count)
    );
  END IF;

  RETURN v_req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_group_buy(uuid, text, text, text) TO authenticated;
