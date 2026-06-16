CREATE OR REPLACE FUNCTION public.get_deal_interest_count(_deal_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Counts only users who actually joined: paid deposit, or approved when no deposit required.
  -- Excludes pending_deposit / interested (haven't paid yet).
  SELECT COUNT(DISTINCT di.user_id)::int
  FROM public.deal_interests di
  LEFT JOIN public.deals d ON d.id::text = di.deal_id
  WHERE di.deal_id = _deal_id
    AND COALESCE(di.is_deleted, false) = false
    AND (
      di.status IN ('paid','committed','joined')
      OR (
        di.lead_status = 'approved'
        AND (COALESCE(d.deposit_required, false) = false OR COALESCE(d.deposit_amount, 0) <= 0)
      )
    )
$function$;