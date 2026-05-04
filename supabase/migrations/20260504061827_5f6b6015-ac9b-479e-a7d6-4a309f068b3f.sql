REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_lead_and_deposit(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_deal_paid_count(_deal_id text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT user_id)::int
  FROM public.deposits
  WHERE deal_id = _deal_id
    AND status = 'paid'
    AND COALESCE(is_deleted, false) = false
$function$;