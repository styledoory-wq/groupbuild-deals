-- 1. participation fee mode on system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS participation_fee_mode text NOT NULL DEFAULT 'enabled';

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_participation_fee_mode_check;
ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_participation_fee_mode_check
  CHECK (participation_fee_mode IN ('enabled','disabled','maintenance'));

-- 2. audit log
CREATE TABLE IF NOT EXISTS public.participation_mode_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid,
  changed_by_email text,
  previous_mode text,
  new_mode text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.participation_mode_audit_log TO authenticated;
GRANT ALL ON public.participation_mode_audit_log TO service_role;

ALTER TABLE public.participation_mode_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read participation mode audit" ON public.participation_mode_audit_log;
CREATE POLICY "Admins can read participation mode audit"
  ON public.participation_mode_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. read mode (fail closed on caller side: raises when unreadable)
CREATE OR REPLACE FUNCTION public.get_participation_fee_mode()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
BEGIN
  SELECT participation_fee_mode INTO v_mode
  FROM public.system_settings
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_mode IS NULL OR v_mode NOT IN ('enabled','disabled','maintenance') THEN
    RAISE EXCEPTION 'participation_fee_mode_unavailable';
  END IF;

  RETURN v_mode;
END;
$$;

REVOKE ALL ON FUNCTION public.get_participation_fee_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_participation_fee_mode() TO authenticated, service_role;

-- 4. admin setter with mandatory reason + audit
CREATE OR REPLACE FUNCTION public.admin_set_participation_fee_mode(_mode text, _reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_id uuid;
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _mode IS NULL OR _mode NOT IN ('enabled','disabled','maintenance') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT id, participation_fee_mode INTO v_id, v_prev
  FROM public.system_settings
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'system_settings_missing';
  END IF;

  UPDATE public.system_settings
  SET participation_fee_mode = _mode
  WHERE id = v_id;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.participation_mode_audit_log
    (changed_by, changed_by_email, previous_mode, new_mode, reason)
  VALUES (auth.uid(), v_email, v_prev, _mode, btrim(_reason));

  RETURN _mode;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_participation_fee_mode(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_participation_fee_mode(text, text) TO authenticated, service_role;

-- 5. free join (only allowed when mode = disabled), idempotent
CREATE OR REPLACE FUNCTION public.join_deal_free(_deal_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_user uuid := auth.uid();
  v_existing uuid;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_mode := public.get_participation_fee_mode();
  IF v_mode <> 'disabled' THEN
    RAISE EXCEPTION 'free_join_not_allowed';
  END IF;

  SELECT id INTO v_existing
  FROM public.deal_interests
  WHERE user_id = v_user AND deal_id = _deal_id AND is_deleted = false
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.deal_interests (
    user_id, deal_id, status, deposit_required, deposit_amount, deposit_status,
    full_name, phone, city, project_name, notes, estimated_quantity,
    terms_accepted_at, lead_status, join_condition, conditional_status
  ) VALUES (
    v_user,
    _deal_id,
    'interested',
    false,
    0,
    'none',
    NULLIF(btrim(coalesce(_payload->>'full_name','')), ''),
    NULLIF(btrim(coalesce(_payload->>'phone','')), ''),
    NULLIF(btrim(coalesce(_payload->>'city','')), ''),
    NULLIF(btrim(coalesce(_payload->>'project_name','')), ''),
    NULLIF(btrim(coalesce(_payload->>'notes','')), ''),
    CASE WHEN _payload->>'estimated_quantity' ~ '^[0-9]+(\.[0-9]+)?$'
         THEN (_payload->>'estimated_quantity')::numeric END,
    now(),
    'new',
    coalesce(NULLIF(_payload->>'join_condition',''), 'immediate'),
    'ok'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_deal_free(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_deal_free(uuid, jsonb) TO authenticated, service_role;

-- 6. supplier terms versioning infrastructure
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS accepted_terms_version text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_terms_metadata jsonb,
  ADD COLUMN IF NOT EXISTS requires_reacceptance boolean NOT NULL DEFAULT false;

UPDATE public.suppliers
SET accepted_terms_version = coalesce(accepted_terms_version, 'v3'),
    terms_version = coalesce(terms_version, 'v3')
WHERE accepted_terms_version IS NULL OR terms_version IS NULL;

GRANT SELECT (terms_version, accepted_terms_version, accepted_terms_at, requires_reacceptance)
  ON public.suppliers TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_supplier_terms(_version text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _version IS NULL OR btrim(_version) = '' THEN
    RAISE EXCEPTION 'version_required';
  END IF;

  UPDATE public.suppliers
  SET accepted_terms_version = _version,
      terms_version = _version,
      accepted_terms_at = now(),
      accepted_terms_metadata = coalesce(_metadata, '{}'::jsonb),
      requires_reacceptance = false
  WHERE user_id = v_user;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_supplier_terms(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_supplier_terms(text, jsonb) TO authenticated, service_role;