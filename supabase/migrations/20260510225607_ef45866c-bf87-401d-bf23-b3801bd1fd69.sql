CREATE OR REPLACE FUNCTION public.set_deposit_hidden(_deposit_id uuid, _hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.deposits
     SET is_hidden = _hidden
   WHERE id = _deposit_id
     AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found_or_forbidden';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_deposit_hidden(uuid, boolean) TO authenticated;