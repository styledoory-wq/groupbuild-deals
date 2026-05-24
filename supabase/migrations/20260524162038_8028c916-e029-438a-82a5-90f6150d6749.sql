-- 1. Enable cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Add reapproval deadline column
ALTER TABLE public.deal_interests
  ADD COLUMN IF NOT EXISTS reapproval_deadline_at timestamptz;

-- 3. Update evaluate_conditional_joiners to set the deadline
CREATE OR REPLACE FUNCTION public.evaluate_conditional_joiners(_deal_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            reapproval_deadline_at = now() + interval '60 minutes',
            updated_at = now()
        WHERE id = v_row.id;
      PERFORM public.notify_user(
        v_row.user_id,
        'מדרגת ההנחה ירדה',
        'מספר המשתתפים בעסקה ירד מתחת למדרגה שבחרת. יש לך 60 דקות לאשר את המשך ההשתתפות במחיר החדש, אחרת תוסר אוטומטית והפיקדון יוחזר.',
        'deal',
        '/my-offers',
        jsonb_build_object('deal_id', _deal_id, 'requires_reapproval', true)
      );
    ELSIF v_paid >= v_row.min_tier_locked AND v_row.conditional_status = 'pending_reapproval' THEN
      UPDATE public.deal_interests
        SET conditional_status = 'ok',
            reapproval_deadline_at = NULL,
            updated_at = now()
        WHERE id = v_row.id;
    END IF;
  END LOOP;
END;
$function$;

-- 4. Auto-leave function
CREATE OR REPLACE FUNCTION public.auto_leave_expired_reapprovals()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_count int := 0;
BEGIN
  FOR v_row IN
    SELECT id, user_id, deal_id
    FROM public.deal_interests
    WHERE conditional_status = 'pending_reapproval'
      AND reapproval_deadline_at IS NOT NULL
      AND reapproval_deadline_at < now()
      AND COALESCE(is_deleted, false) = false
  LOOP
    -- Mark interest as left/deleted
    UPDATE public.deal_interests
      SET status = 'left',
          lead_status = 'left',
          conditional_status = 'left',
          is_deleted = true,
          deleted_at = now(),
          updated_at = now()
      WHERE id = v_row.id;

    -- Mark any paid deposit as refunded (DB-side; admin handles real money refund)
    UPDATE public.deposits
      SET status = 'refunded'::deposit_status,
          refunded_at = COALESCE(refunded_at, now()),
          metadata = COALESCE(metadata, '{}'::jsonb) ||
                     jsonb_build_object('refund_reason', 'auto_leave_tier_drop', 'auto_processed_at', now())
      WHERE user_id = v_row.user_id
        AND deal_id = v_row.deal_id
        AND status = 'paid'::deposit_status
        AND COALESCE(is_deleted, false) = false;

    -- Notify user
    PERFORM public.notify_user(
      v_row.user_id,
      'הוסרת אוטומטית מההצעה',
      'לא אישרת את המשך ההשתתפות בתוך 60 דקות. הפיקדון שלך סומן להחזר ויטופל על ידי הצוות.',
      'deal',
      '/my-offers',
      jsonb_build_object('deal_id', v_row.deal_id)
    );

    -- Notify admins
    PERFORM public.notify_admins(
      'דייר הוסר אוטומטית — נדרש החזר פיקדון',
      'דייר הוסר אוטומטית מעסקה ' || v_row.deal_id || ' לאחר 60 דקות ללא תגובה. יש לבצע החזר כספי בפועל.',
      'deposit',
      '/admin/deposits',
      jsonb_build_object('deal_id', v_row.deal_id, 'user_id', v_row.user_id, 'reason', 'auto_leave_tier_drop')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 5. Schedule every 5 minutes (unschedule first if it exists)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-leave-expired-reapprovals');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-leave-expired-reapprovals',
  '*/5 * * * *',
  $$SELECT public.auto_leave_expired_reapprovals();$$
);