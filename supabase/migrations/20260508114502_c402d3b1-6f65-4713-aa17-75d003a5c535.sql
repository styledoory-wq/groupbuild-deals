
ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS join_condition text NOT NULL DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS min_tier_locked integer,
  ADD COLUMN IF NOT EXISTS conditional_status text NOT NULL DEFAULT 'ok';

ALTER TABLE public.deal_interests
  DROP CONSTRAINT IF EXISTS deal_interests_join_condition_check;
ALTER TABLE public.deal_interests
  ADD CONSTRAINT deal_interests_join_condition_check
  CHECK (join_condition IN ('flexible','conditional'));

ALTER TABLE public.deal_interests
  DROP CONSTRAINT IF EXISTS deal_interests_conditional_status_check;
ALTER TABLE public.deal_interests
  ADD CONSTRAINT deal_interests_conditional_status_check
  CHECK (conditional_status IN ('ok','pending_reapproval','withdrawn'));

-- Trigger: when a deposit moves to/from paid, evaluate conditional joiners
CREATE OR REPLACE FUNCTION public.evaluate_conditional_joiners(_deal_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid int;
  v_row record;
BEGIN
  SELECT public.get_deal_paid_count(_deal_id) INTO v_paid;

  FOR v_row IN
    SELECT id, user_id, min_tier_locked, conditional_status
    FROM public.deal_interests
    WHERE deal_id = _deal_id
      AND COALESCE(is_deleted,false) = false
      AND join_condition = 'conditional'
      AND min_tier_locked IS NOT NULL
  LOOP
    IF v_paid < v_row.min_tier_locked AND v_row.conditional_status = 'ok' THEN
      UPDATE public.deal_interests
        SET conditional_status = 'pending_reapproval',
            lead_status = 'pending_reapproval',
            updated_at = now()
        WHERE id = v_row.id;
      PERFORM public.notify_user(
        v_row.user_id,
        'מדרגת ההנחה ירדה',
        'מספר המשתתפים בעסקה ירד מתחת למדרגה שבחרת. נדרש אישור מחדש להמשך השתתפות.',
        'deal',
        '/my-offers',
        jsonb_build_object('deal_id', _deal_id)
      );
    ELSIF v_paid >= v_row.min_tier_locked AND v_row.conditional_status = 'pending_reapproval' THEN
      UPDATE public.deal_interests
        SET conditional_status = 'ok',
            updated_at = now()
        WHERE id = v_row.id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_eval_conditional_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_conditional_joiners(COALESCE(NEW.deal_id, OLD.deal_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_eval_conditional_joiners ON public.deposits;
CREATE TRIGGER trg_eval_conditional_joiners
AFTER INSERT OR UPDATE OF status, is_deleted OR DELETE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_eval_conditional_on_deposit();
