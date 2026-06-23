
-- 1. committee_quote_requests: tighten policy role to authenticated
DROP POLICY IF EXISTS "Suppliers view open requests in their categories" ON public.committee_quote_requests;
CREATE POLICY "Suppliers view open requests in their categories"
ON public.committee_quote_requests
FOR SELECT
TO authenticated
USING (
  (supplier_id IS NULL)
  AND (status = 'open'::text)
  AND (category_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.user_id = auth.uid()
      AND committee_quote_requests.category_id = ANY (s.categories)
  )
);

-- 2. deals: revoke column-level SELECT on payment instruction fields from anon + authenticated
REVOKE SELECT (supplier_payment_instructions, supplier_payment_link)
  ON public.deals FROM anon, authenticated;

-- 3. suppliers: revoke column-level SELECT on bank/Bit fields from anon + authenticated
REVOKE SELECT (bank_account_number, bank_branch, bank_name, bank_account_holder, bit_phone)
  ON public.suppliers FROM anon, authenticated;

-- 4. vouchers: revoke column-level SELECT on rotation_secret from anon + authenticated
REVOKE SELECT (rotation_secret) ON public.vouchers FROM anon, authenticated;

-- 5. set immutable search_path on email infra functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
