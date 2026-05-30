
-- 1) Effective target helper: prefer target_participants, fall back to max tier participants
CREATE OR REPLACE FUNCTION public.deal_effective_target(_deal_id text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target int;
  v_tier_max int;
BEGIN
  SELECT target_participants INTO v_target
    FROM public.deals WHERE id::text = _deal_id LIMIT 1;
  IF v_target IS NOT NULL AND v_target > 0 THEN RETURN v_target; END IF;

  SELECT MAX( NULLIF((t->>'maxParticipants'),'')::int )
    INTO v_tier_max
  FROM public.deals d,
       LATERAL jsonb_array_elements(COALESCE(d.tiers,'[]'::jsonb)) t
   WHERE d.id::text = _deal_id;

  RETURN v_tier_max;
END;
$$;

-- 2) Update auto-close from interest (deposit-free path) to use effective target
CREATE OR REPLACE FUNCTION public.trg_auto_close_deal_from_interest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_paid int;
  v_target int;
BEGIN
  IF NEW.lead_status IS DISTINCT FROM 'approved' THEN RETURN NEW; END IF;

  SELECT id, target_participants, status, auto_closed_at, deposit_required, deposit_amount
    INTO v_deal
  FROM public.deals WHERE id::text = NEW.deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN NEW; END IF;

  IF COALESCE(v_deal.deposit_required, false) AND COALESCE(v_deal.deposit_amount, 0) > 0 THEN
    RETURN NEW;
  END IF;

  v_target := public.deal_effective_target(NEW.deal_id);

  IF v_deal.auto_closed_at IS NULL AND v_target IS NOT NULL THEN
    v_paid := public.get_deal_paid_count(NEW.deal_id);
    IF v_paid >= v_target THEN
      UPDATE public.deals SET status = 'closed', auto_closed_at = now() WHERE id = v_deal.id;
      PERFORM public.issue_vouchers_for_deal(NEW.deal_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Update auto-close from deposit to use effective target
CREATE OR REPLACE FUNCTION public.trg_auto_close_deal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_paid int;
  v_target int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT id, target_participants, status, auto_closed_at INTO v_deal
    FROM public.deals WHERE id::text = NEW.deal_id LIMIT 1;
  IF v_deal.id IS NULL OR v_deal.auto_closed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.status <> 'paid'::deposit_status THEN RETURN NEW; END IF;

  v_target := public.deal_effective_target(NEW.deal_id);
  IF v_target IS NULL THEN RETURN NEW; END IF;

  v_paid := public.get_deal_paid_count(NEW.deal_id);
  IF v_paid >= v_target THEN
    UPDATE public.deals SET status = 'closed', auto_closed_at = now() WHERE id = v_deal.id;
    PERFORM public.issue_vouchers_for_deal(NEW.deal_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) (Re)create the actual triggers that fire these functions
DROP TRIGGER IF EXISTS trg_auto_close_deal_from_interest_aiu ON public.deal_interests;
CREATE TRIGGER trg_auto_close_deal_from_interest_aiu
AFTER INSERT OR UPDATE OF lead_status ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_close_deal_from_interest();

DROP TRIGGER IF EXISTS trg_notify_deal_interest_ai ON public.deal_interests;
CREATE TRIGGER trg_notify_deal_interest_ai
AFTER INSERT ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deal_interest();

DROP TRIGGER IF EXISTS deal_interests_set_updated_at ON public.deal_interests;
CREATE TRIGGER deal_interests_set_updated_at
BEFORE UPDATE ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS deposits_integrity ON public.deposits;
CREATE TRIGGER deposits_integrity
BEFORE INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.enforce_deposit_integrity();

DROP TRIGGER IF EXISTS trg_auto_close_deal_aiu ON public.deposits;
CREATE TRIGGER trg_auto_close_deal_aiu
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_close_deal();

DROP TRIGGER IF EXISTS trg_notify_deposit_change_aiu ON public.deposits;
CREATE TRIGGER trg_notify_deposit_change_aiu
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deposit_change();

DROP TRIGGER IF EXISTS trg_eval_conditional_on_deposit_aiu ON public.deposits;
CREATE TRIGGER trg_eval_conditional_on_deposit_aiu
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_eval_conditional_on_deposit();

DROP TRIGGER IF EXISTS trg_log_deposit_visibility_au ON public.deposits;
CREATE TRIGGER trg_log_deposit_visibility_au
AFTER UPDATE OF is_hidden ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_log_deposit_visibility();

DROP TRIGGER IF EXISTS deals_validate_offer ON public.deals;
CREATE TRIGGER deals_validate_offer
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_offer();

DROP TRIGGER IF EXISTS deals_lock_closed_fields ON public.deals;
CREATE TRIGGER deals_lock_closed_fields
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.lock_closed_deal_fields();

DROP TRIGGER IF EXISTS deals_set_updated_at ON public.deals;
CREATE TRIGGER deals_set_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Backfill: close any active deals that already meet their effective target, and issue vouchers
DO $$
DECLARE r RECORD; v_target int; v_paid int;
BEGIN
  FOR r IN SELECT id::text AS id FROM public.deals
           WHERE status = 'active' AND COALESCE(is_deleted,false) = false
             AND auto_closed_at IS NULL
  LOOP
    v_target := public.deal_effective_target(r.id);
    IF v_target IS NULL THEN CONTINUE; END IF;
    v_paid := public.get_deal_paid_count(r.id);
    IF v_paid >= v_target THEN
      UPDATE public.deals SET status='closed', auto_closed_at=now() WHERE id::text = r.id;
      PERFORM public.issue_vouchers_for_deal(r.id);
    END IF;
  END LOOP;
END $$;
