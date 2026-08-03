DROP TRIGGER IF EXISTS deposits_notify_change ON public.deposits;

CREATE OR REPLACE FUNCTION public.trg_notify_deposit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'פיקדון חדש בהמתנה',
      'סכום: ' || NEW.amount::text || ' ש״ח',
      'deposit',
      '/admin/deposits',
      jsonb_build_object('deposit_id', NEW.id, 'deal_id', NEW.deal_id)
    );
    PERFORM public.notify_user(
      NEW.user_id,
      'הפיקדון נרשם',
      'הפיקדון שלך התקבל וממתין לאישור.',
      'deposit',
      '/my-offers',
      jsonb_build_object('deposit_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status::text = 'paid' THEN
      UPDATE public.deal_interests
      SET deposit_status = 'paid',
          status = 'paid',
          lead_status = CASE WHEN lead_status IN ('new', 'pending') THEN 'approved' ELSE lead_status END,
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND deal_id = NEW.deal_id
        AND COALESCE(is_deleted, false) = false;

      PERFORM public.notify_user(
        NEW.user_id,
        'הפיקדון אושר',
        'הפיקדון שלך אושר וההצטרפות שלך להצעה הושלמה.',
        'deposit',
        '/my-offers',
        jsonb_build_object('deposit_id', NEW.id)
      );
    ELSIF NEW.status::text = 'refunded' THEN
      UPDATE public.deal_interests
      SET deposit_status = 'refunded',
          status = 'refunded',
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND deal_id = NEW.deal_id
        AND COALESCE(is_deleted, false) = false;
      -- Refund notification intentionally NOT sent here.
      -- Single source of truth: the refund flow (edge function) sends
      -- in-app + email + push exactly once per deposit.
    END IF;
  END IF;
  RETURN NEW;
END;
$$;