-- ============================================================
-- Lock down internal SECURITY DEFINER functions
-- ============================================================

-- Trigger-only / internal: revoke ALL execute
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'update_updated_at_column()',
    'validate_deal_offer()',
    'handle_new_user()',
    'trg_notify_deal_interest()',
    'refresh_supplier_service_areas_on_supplier()',
    'refresh_supplier_service_areas_trigger()',
    'refresh_supplier_service_areas(uuid)',
    'trg_notify_new_waitlist()',
    'notify_admins(text,text,text,text,jsonb)',
    'get_deal_interest_count(text)',
    'trg_notify_new_supplier()',
    'notify_user(uuid,text,text,text,text,jsonb)',
    'enforce_deposit_integrity()',
    'validate_supplier_catalog()',
    'create_default_notification_settings()',
    'trg_log_deposit_visibility()',
    'trg_eval_conditional_on_deposit()',
    'trg_notify_supplier_inquiry()',
    'evaluate_conditional_joiners(text)',
    'get_landing_stats()',
    'trg_notify_deposit_change()',
    'auto_leave_expired_reapprovals()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Signed-in-only RPC functions: revoke from PUBLIC and anon, keep authenticated
REVOKE ALL ON FUNCTION public.set_deposit_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_deposit_hidden(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) TO authenticated;

-- Public-readable RPC functions (required by RLS / Landing page): explicit grants
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.user_can_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_review(uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_deal_paid_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_supplier_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_rating(uuid) TO anon, authenticated;

-- ============================================================
-- Tighten permissive waitlist insert policy
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist_leads;

CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(coalesce(full_name, ''))) > 0
  AND length(trim(coalesce(phone, ''))) > 0
  AND length(coalesce(full_name, '')) <= 200
  AND length(coalesce(phone, '')) <= 50
  AND lead_type IN ('resident', 'supplier')
);