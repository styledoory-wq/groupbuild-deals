-- Tighten grants for helper functions and remove duplicate triggers

REVOKE ALL ON FUNCTION public.is_supplier_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_supplier_for_deal(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_participates_in_deal(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supplier_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_supplier_for_deal(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_participates_in_deal(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_deal_paid_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deal_effective_target(text) TO anon, authenticated, service_role;

-- The public active-deals policy does not need supplier-owner bypass; supplier-owned deals are covered by a separate authenticated policy.
DROP POLICY IF EXISTS "Public can view active deals" ON public.deals;
CREATE POLICY "Public can view active deals"
ON public.deals
FOR SELECT
TO public
USING (
  status = 'active'
  AND COALESCE(is_deleted, false) = false
  AND EXISTS (
    SELECT 1
    FROM public.suppliers s
    WHERE s.id = deals.supplier_id
      AND s.is_active = true
      AND COALESCE(s.is_deleted, false) = false
      AND s.approval_status = ANY (ARRAY['approved'::text, 'active'::text])
  )
  AND (
    visibility_type = 'public'
    OR (
      visibility_type = 'project_only'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.project_id = deals.visibility_project_id
      )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Remove historical duplicate triggers, then recreate a single canonical trigger for each behavior.
DROP TRIGGER IF EXISTS deal_interests_auto_close ON public.deal_interests;
DROP TRIGGER IF EXISTS trg_auto_close_deal_from_interest ON public.deal_interests;
DROP TRIGGER IF EXISTS trg_auto_close_deal_from_interest_aiu ON public.deal_interests;
DROP TRIGGER IF EXISTS deal_interests_notify ON public.deal_interests;
DROP TRIGGER IF EXISTS notify_on_deal_interest ON public.deal_interests;
DROP TRIGGER IF EXISTS trg_notify_deal_interest ON public.deal_interests;
DROP TRIGGER IF EXISTS trg_notify_deal_interest_ai ON public.deal_interests;
DROP TRIGGER IF EXISTS deal_interests_set_updated_at ON public.deal_interests;
DROP TRIGGER IF EXISTS deal_interests_updated_at ON public.deal_interests;

CREATE TRIGGER deal_interests_auto_close
AFTER INSERT OR UPDATE OF lead_status, status, is_deleted
ON public.deal_interests
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_close_deal_from_interest();

CREATE TRIGGER deal_interests_notify
AFTER INSERT
ON public.deal_interests
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_deal_interest();

CREATE TRIGGER deal_interests_updated_at
BEFORE UPDATE
ON public.deal_interests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS deals_lock_closed ON public.deals;
DROP TRIGGER IF EXISTS deals_lock_closed_fields ON public.deals;
DROP TRIGGER IF EXISTS deals_set_updated_at ON public.deals;
DROP TRIGGER IF EXISTS deals_updated_at ON public.deals;
DROP TRIGGER IF EXISTS deals_validate_offer ON public.deals;
DROP TRIGGER IF EXISTS validate_deal_offer_trigger ON public.deals;

CREATE TRIGGER deals_lock_closed_fields
BEFORE UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.lock_closed_deal_fields();

CREATE TRIGGER deals_updated_at
BEFORE UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER deals_validate_offer
BEFORE INSERT OR UPDATE
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.validate_deal_offer();

DROP TRIGGER IF EXISTS deposits_auto_close ON public.deposits;
DROP TRIGGER IF EXISTS deposits_auto_close_deal ON public.deposits;
DROP TRIGGER IF EXISTS deposits_enforce_integrity ON public.deposits;
DROP TRIGGER IF EXISTS deposits_integrity ON public.deposits;
DROP TRIGGER IF EXISTS deposits_eval_conditional ON public.deposits;
DROP TRIGGER IF EXISTS trg_eval_conditional_on_deposit ON public.deposits;
DROP TRIGGER IF EXISTS deposits_log_visibility ON public.deposits;
DROP TRIGGER IF EXISTS log_deposit_visibility ON public.deposits;
DROP TRIGGER IF EXISTS deposits_notify_change ON public.deposits;
DROP TRIGGER IF EXISTS trg_notify_deposit_change ON public.deposits;

CREATE TRIGGER deposits_enforce_integrity
BEFORE INSERT OR UPDATE
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.enforce_deposit_integrity();

CREATE TRIGGER deposits_auto_close
AFTER INSERT OR UPDATE OF status
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_close_deal();

CREATE TRIGGER deposits_notify_change
AFTER INSERT OR UPDATE OF status
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_deposit_change();

CREATE TRIGGER deposits_eval_conditional
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_eval_conditional_on_deposit();

CREATE TRIGGER deposits_log_visibility
AFTER UPDATE OF is_hidden
ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.trg_log_deposit_visibility();