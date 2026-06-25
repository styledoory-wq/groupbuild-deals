
-- 1) Lock down suppliers SELECT to column-level grants
REVOKE SELECT ON public.suppliers FROM anon, authenticated;

-- Anonymous: public marketing only (no PII, no bank, no billing)
GRANT SELECT (
  id, business_name, description, categories, serves_all_country, is_active,
  approval_status, created_at, updated_at, short_description, logo_url,
  website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  service_areas, is_demo, is_deleted, supplier_kind, offers_services,
  offers_products, trust_score, verified_supplier, complaints_count,
  successful_redemptions, is_suspended
) ON public.suppliers TO anon;

-- Authenticated: above + contact PII, no bank, no billing
GRANT SELECT (
  id, user_id, business_name, contact_name, phone, email, description, categories,
  serves_all_country, is_active, approval_status, created_at, updated_at,
  short_description, logo_url, website_url, whatsapp_url, instagram_url,
  facebook_url, catalog_url, service_areas, is_demo, is_deleted, deleted_at,
  supplier_kind, offers_services, offers_products, trust_score, verified_supplier,
  complaints_count, successful_redemptions, is_suspended,
  lead_fee, success_fee, success_fee_type
) ON public.suppliers TO authenticated;

-- 2) RPC: supplier owner reads own payment details
CREATE OR REPLACE FUNCTION public.get_own_supplier_payment_info()
RETURNS TABLE(
  bit_phone text,
  bank_account_holder text,
  bank_name text,
  bank_branch text,
  bank_account_number text,
  payment_instructions_note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.bit_phone, s.bank_account_holder, s.bank_name, s.bank_branch,
         s.bank_account_number, s.payment_instructions_note
  FROM public.suppliers s
  WHERE s.user_id = auth.uid()
    AND COALESCE(s.is_deleted, false) = false
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_own_supplier_payment_info() TO authenticated;

-- 3) RPC: payment details for a deal the caller participates in
CREATE OR REPLACE FUNCTION public.get_deal_supplier_payment_info(_deal_id text)
RETURNS TABLE(
  business_name text,
  bit_phone text,
  bank_account_holder text,
  bank_name text,
  bank_branch text,
  bank_account_number text,
  payment_instructions_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT d.supplier_id INTO v_supplier_id
  FROM public.deals d
  WHERE d.id::text = _deal_id
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'deal_not_found';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_supplier_owner(v_supplier_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.deal_interests di
      WHERE di.deal_id = _deal_id
        AND di.user_id = auth.uid()
        AND COALESCE(di.is_deleted, false) = false
    )
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
    SELECT s.business_name, s.bit_phone, s.bank_account_holder, s.bank_name,
           s.bank_branch, s.bank_account_number, s.payment_instructions_note
    FROM public.suppliers s
    WHERE s.id = v_supplier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_supplier_payment_info(text) TO authenticated;

-- 4) Lock down vouchers SELECT to exclude rotation_secret
REVOKE SELECT ON public.vouchers FROM anon, authenticated;

GRANT SELECT (
  id, deal_id, user_id, supplier_id, code, reference_number, status,
  issued_at, expires_at, redeemed_at, redeemed_by_supplier_id, metadata,
  created_at, updated_at
) ON public.vouchers TO authenticated;
