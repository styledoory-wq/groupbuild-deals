-- Patch: referral code auth + provisional GB code resolution
-- Safe to run whether or not the original referral migration used the older RPC bodies.

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_origin text := 'https://groupbuild.co.il';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (
    public.has_role(v_user, 'resident')
    OR public.has_role(v_user, 'committee')
    OR public.has_role(v_user, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user AND lower(coalesce(user_type, '')) IN ('resident', 'committee')
    )
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT referral_code INTO v_code FROM public.profiles WHERE id = v_user;
  IF v_code IS NULL OR btrim(v_code) = '' THEN
    v_code := public._generate_referral_code();
    UPDATE public.profiles SET referral_code = v_code WHERE id = v_user;
  END IF;

  RETURN jsonb_build_object(
    'referral_code', v_code,
    'referral_link', v_origin || '/auth/supplier?mode=signup&ref=' || v_code,
    'program_enabled', public._referral_program_active(),
    'reward_amount', public._referral_reward_amount()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_referral_on_supplier_signup(
  _code text,
  _supplier_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_invitee uuid := coalesce(_supplier_user_id, v_caller);
  v_code text := upper(btrim(coalesce(_code, '')));
  v_referrer uuid;
  v_supplier_id uuid;
  v_email text;
  v_phone text;
  v_norm_phone text;
  v_existing uuid;
  v_dup_reason text := NULL;
  v_status text := 'registered';
  v_id uuid;
  v_onboarding boolean;
  v_approval text;
  v_complete boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_invitee IS DISTINCT FROM v_caller
     AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  IF NOT public._referral_program_active() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_disabled');
  END IF;

  SELECT id INTO v_referrer
  FROM public.profiles
  WHERE referral_code = v_code
  LIMIT 1;

  IF v_referrer IS NULL AND v_code ~ '^GB[0-9A-F]{8}$' THEN
    SELECT id INTO v_referrer
    FROM public.profiles
    WHERE upper(replace(id::text, '-', '')) LIKE substring(v_code from 3 for 8) || '%'
    LIMIT 1;
  END IF;

  IF v_referrer IS NULL THEN
    BEGIN
      IF v_code ~ '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$' THEN
        SELECT id INTO v_referrer FROM public.profiles WHERE id = v_code::uuid LIMIT 1;
      ELSIF v_code ~ '^[0-9A-F]{32}$' THEN
        SELECT id INTO v_referrer
        FROM public.profiles
        WHERE replace(id::text, '-', '') = lower(v_code)
        LIMIT 1;
      END IF;
    EXCEPTION WHEN others THEN
      v_referrer := NULL;
    END;
  END IF;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF v_referrer = v_invitee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  SELECT id INTO v_existing
  FROM public.supplier_referrals
  WHERE invitee_user_id = v_invitee
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'referral_id', v_existing, 'already_exists', true);
  END IF;

  SELECT email, phone, onboarding_completed
  INTO v_email, v_phone, v_onboarding
  FROM public.profiles WHERE id = v_invitee;

  SELECT id INTO v_supplier_id FROM public.suppliers WHERE user_id = v_invitee LIMIT 1;

  IF v_supplier_id IS NOT NULL THEN
    SELECT email, phone, approval_status,
      (
        coalesce(btrim(business_name), '') <> ''
        AND coalesce(btrim(phone), '') <> ''
        AND length(coalesce(btrim(description), btrim(short_description), '')) >= 10
      )
    INTO v_email, v_phone, v_approval, v_complete
    FROM public.suppliers WHERE id = v_supplier_id;

    IF v_approval IN ('approved', 'active') THEN
      v_status := 'approved';
    ELSIF v_approval = 'rejected' THEN
      v_status := 'rejected';
    ELSIF coalesce(v_complete, false) THEN
      v_status := 'pending_approval';
    ELSIF coalesce(v_onboarding, false) THEN
      v_status := 'onboarding_completed';
    ELSE
      v_status := 'registered';
    END IF;
  END IF;

  v_norm_phone := public._normalize_phone(v_phone);

  IF v_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE lower(email) = lower(v_email)
      AND user_id IS DISTINCT FROM v_invitee
      AND coalesce(is_deleted, false) = false
  ) THEN
    v_dup_reason := 'duplicate_email';
  ELSIF v_norm_phone IS NOT NULL AND length(v_norm_phone) >= 9 AND EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE public._normalize_phone(phone) = v_norm_phone
      AND user_id IS DISTINCT FROM v_invitee
      AND coalesce(is_deleted, false) = false
  ) THEN
    v_dup_reason := 'duplicate_phone';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE user_id = v_referrer
      AND (
        (v_email IS NOT NULL AND lower(email) = lower(v_email))
        OR (v_norm_phone IS NOT NULL AND length(v_norm_phone) >= 9
            AND public._normalize_phone(phone) = v_norm_phone)
      )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral_identity');
  END IF;

  INSERT INTO public.supplier_referrals (
    referrer_user_id, referral_code, invitee_supplier_id, invitee_user_id,
    invitee_email, invitee_phone, status, duplicate_suspicion, duplicate_reason
  ) VALUES (
    v_referrer, v_code, v_supplier_id, v_invitee,
    v_email, v_phone, v_status,
    v_dup_reason IS NOT NULL, v_dup_reason
  )
  RETURNING id INTO v_id;

  PERFORM public._write_referral_audit(
    v_id, v_caller, 'attached', NULL, v_status,
    jsonb_build_object('code', v_code, 'duplicate_reason', v_dup_reason)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'referral_id', v_id,
    'status', v_status,
    'duplicate_suspicion', v_dup_reason IS NOT NULL
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing FROM public.supplier_referrals WHERE invitee_user_id = v_invitee LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'referral_id', v_existing, 'already_exists', true);
END;
$$;
