-- 1. Remove blanket SELECT and re-grant only non-sensitive columns
REVOKE SELECT ON TABLE public.suppliers FROM anon, authenticated;

GRANT SELECT (
  id, user_id, business_name, contact_name, phone, email, description, categories,
  serves_all_country, is_active, approval_status, created_at, updated_at, short_description,
  logo_url, website_url, whatsapp_url, instagram_url, facebook_url, catalog_url,
  service_areas, is_demo, is_deleted, deleted_at, commission_percent, monthly_subscription,
  billing_status, billing_notes, supplier_kind, offers_services, offers_products, trust_score,
  verified_supplier, complaints_count, successful_redemptions, is_suspended, lead_fee,
  success_fee, success_fee_type, profile_reminder_sent_at, business_hours, years_experience,
  employees_count, languages, payment_methods, avg_response_time_hours, licenses,
  weekend_service, emergency_service, warranty_offered, slug
) ON public.suppliers TO anon, authenticated;

GRANT ALL ON public.suppliers TO service_role;

-- 2. Admin secure read of payment info
CREATE OR REPLACE FUNCTION public.admin_get_supplier_payment_info(_supplier_id uuid)
RETURNS TABLE (
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
  WHERE s.id = _supplier_id
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_get_supplier_payment_info(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_supplier_payment_info(uuid) TO authenticated, service_role;

-- 3. Admin secure update of payment info
CREATE OR REPLACE FUNCTION public.admin_update_supplier_payment_info(
  _supplier_id uuid,
  _bit_phone text DEFAULT NULL,
  _bank_account_holder text DEFAULT NULL,
  _bank_name text DEFAULT NULL,
  _bank_branch text DEFAULT NULL,
  _bank_account_number text DEFAULT NULL,
  _payment_instructions_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.suppliers s
  SET bit_phone = _bit_phone,
      bank_account_holder = _bank_account_holder,
      bank_name = _bank_name,
      bank_branch = _bank_branch,
      bank_account_number = _bank_account_number,
      payment_instructions_note = _payment_instructions_note,
      updated_at = now()
  WHERE s.id = _supplier_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_supplier_payment_info(uuid, text, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_supplier_payment_info(uuid, text, text, text, text, text, text) TO authenticated, service_role;