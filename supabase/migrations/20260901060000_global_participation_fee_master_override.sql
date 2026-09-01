-- The global participation fee switch is the master safety/business control.
-- When globally disabled or in maintenance, no per-deal override may re-enable charging.
CREATE OR REPLACE FUNCTION public.get_effective_participation_fee_mode(_deal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global text;
  v_override text;
BEGIN
  v_global := public.get_participation_fee_mode();

  -- Global switch always wins.
  IF v_global IN ('disabled', 'maintenance') THEN
    RETURN v_global;
  END IF;

  SELECT participation_fee_override_mode
    INTO v_override
    FROM public.deals
   WHERE id = _deal_id AND is_deleted = false;

  IF v_override = 'disabled' THEN RETURN 'disabled'; END IF;
  IF v_override = 'enabled' THEN RETURN 'enabled'; END IF;
  RETURN v_global;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_participation_fee_mode(uuid)
TO anon, authenticated, service_role;
