-- =============================================================================
-- Supplier referral program + resident credit wallets
-- =============================================================================

-- 1. Enum extension for credit-only payments
ALTER TYPE public.payment_provider_enum ADD VALUE IF NOT EXISTS 'credit';

-- 2. Program settings on system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS supplier_referral_program_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supplier_referral_reward_amount numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS supplier_referral_program_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_referral_program_ends_at timestamptz;

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_referral_reward_amount_check;
ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_referral_reward_amount_check
  CHECK (supplier_referral_reward_amount >= 0);

-- 3. Referral code on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- 4. Referrals table
CREATE TABLE IF NOT EXISTS public.supplier_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  invitee_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invitee_user_id uuid,
  invitee_email text,
  invitee_phone text,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN (
      'invited',
      'registered',
      'onboarding_completed',
      'pending_approval',
      'approved',
      'rejected',
      'reward_granted',
      'cancelled'
    )),
  reward_amount numeric,
  reward_granted_at timestamptz,
  reward_transaction_id uuid,
  reward_notified_at timestamptz,
  duplicate_suspicion boolean NOT NULL DEFAULT false,
  duplicate_reason text,
  fraud_flag boolean NOT NULL DEFAULT false,
  cancelled_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_referrals_invitee_supplier_uidx
  ON public.supplier_referrals (invitee_supplier_id)
  WHERE invitee_supplier_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_referrals_invitee_user_uidx
  ON public.supplier_referrals (invitee_user_id)
  WHERE invitee_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_referrals_referrer_idx
  ON public.supplier_referrals (referrer_user_id);

CREATE INDEX IF NOT EXISTS supplier_referrals_status_idx
  ON public.supplier_referrals (status);

CREATE INDEX IF NOT EXISTS supplier_referrals_code_idx
  ON public.supplier_referrals (referral_code);

-- 5. Credit wallets
CREATE TABLE IF NOT EXISTS public.resident_credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance numeric NOT NULL DEFAULT 0,
  used_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  allow_negative boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resident_credit_wallets_used_nonneg CHECK (used_balance >= 0),
  CONSTRAINT resident_credit_wallets_earned_nonneg CHECK (total_earned >= 0)
);

-- 6. Credit ledger
CREATE TABLE IF NOT EXISTS public.resident_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN (
    'referral_reward',
    'deal_join_payment',
    'admin_adjustment',
    'reversal',
    'expired'
  )),
  source text NOT NULL,
  referral_id uuid REFERENCES public.supplier_referrals(id) ON DELETE SET NULL,
  deal_id uuid,
  deposit_id uuid,
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'reversed', 'pending_reserve')),
  description text,
  idempotency_key text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS resident_credit_transactions_idempotency_uidx
  ON public.resident_credit_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS resident_credit_transactions_user_idx
  ON public.resident_credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS resident_credit_transactions_deposit_idx
  ON public.resident_credit_transactions (deposit_id)
  WHERE deposit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS resident_credit_transactions_referral_idx
  ON public.resident_credit_transactions (referral_id)
  WHERE referral_id IS NOT NULL;

-- FK from referrals.reward_transaction_id once ledger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_referrals_reward_tx_fkey'
  ) THEN
    ALTER TABLE public.supplier_referrals
      ADD CONSTRAINT supplier_referrals_reward_tx_fkey
      FOREIGN KEY (reward_transaction_id)
      REFERENCES public.resident_credit_transactions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Deposit split payment columns
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS credit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount numeric,
  ADD COLUMN IF NOT EXISTS credit_transaction_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deposits_credit_tx_fkey'
  ) THEN
    ALTER TABLE public.deposits
      ADD CONSTRAINT deposits_credit_tx_fkey
      FOREIGN KEY (credit_transaction_id)
      REFERENCES public.resident_credit_transactions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.deposits
  DROP CONSTRAINT IF EXISTS deposits_credit_amount_nonneg;
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_credit_amount_nonneg CHECK (credit_amount >= 0);

-- 8. Audit log
CREATE TABLE IF NOT EXISTS public.supplier_referral_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.supplier_referrals(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_referral_audit_log_referral_idx
  ON public.supplier_referral_audit_log (referral_id, created_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.supplier_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_referral_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Residents read own referrals" ON public.supplier_referrals;
CREATE POLICY "Residents read own referrals"
  ON public.supplier_referrals FOR SELECT TO authenticated
  USING (
    auth.uid() = referrer_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins manage referrals" ON public.supplier_referrals;
CREATE POLICY "Admins manage referrals"
  ON public.supplier_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Residents read own wallet" ON public.resident_credit_wallets;
CREATE POLICY "Residents read own wallet"
  ON public.resident_credit_wallets FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Residents read own credit tx" ON public.resident_credit_transactions;
CREATE POLICY "Residents read own credit tx"
  ON public.resident_credit_transactions FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins read referral audit" ON public.supplier_referral_audit_log;
CREATE POLICY "Admins read referral audit"
  ON public.supplier_referral_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.supplier_referrals TO authenticated;
GRANT SELECT ON public.resident_credit_wallets TO authenticated;
GRANT SELECT ON public.resident_credit_transactions TO authenticated;
GRANT SELECT ON public.supplier_referral_audit_log TO authenticated;
GRANT ALL ON public.supplier_referrals TO service_role;
GRANT ALL ON public.resident_credit_wallets TO service_role;
GRANT ALL ON public.resident_credit_transactions TO service_role;
GRANT ALL ON public.supplier_referral_audit_log TO service_role;

-- =============================================================================
-- Helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public._generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = result
    );
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'referral_code_generation_failed';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_credit_wallet(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resident_credit_wallets (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public._referral_program_active()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  SELECT
    supplier_referral_program_enabled,
    supplier_referral_program_starts_at,
    supplier_referral_program_ends_at
  INTO v_enabled, v_starts, v_ends
  FROM public.system_settings
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF NOT coalesce(v_enabled, false) THEN
    RETURN false;
  END IF;
  IF v_starts IS NOT NULL AND now() < v_starts THEN
    RETURN false;
  END IF;
  IF v_ends IS NOT NULL AND now() > v_ends THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public._referral_reward_amount()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
BEGIN
  SELECT supplier_referral_reward_amount INTO v_amount
  FROM public.system_settings
  ORDER BY created_at NULLS LAST
  LIMIT 1;
  RETURN coalesce(v_amount, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public._normalize_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public._write_referral_audit(
  _referral_id uuid,
  _actor_id uuid,
  _action text,
  _from_status text,
  _to_status text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.supplier_referral_audit_log
    (referral_id, actor_id, action, from_status, to_status, metadata)
  VALUES
    (_referral_id, _actor_id, _action, _from_status, _to_status, coalesce(_metadata, '{}'::jsonb));
END;
$$;

-- =============================================================================
-- Resident RPCs
-- =============================================================================

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

  IF NOT public.has_role(v_user, 'resident')
     AND NOT public.has_role(v_user, 'committee')
     AND NOT public.has_role(v_user, 'admin') THEN
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

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_resident_credit_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_wallet public.resident_credit_wallets%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._ensure_credit_wallet(v_user);
  SELECT * INTO v_wallet FROM public.resident_credit_wallets WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'available_balance', coalesce(v_wallet.available_balance, 0),
    'used_balance', coalesce(v_wallet.used_balance, 0),
    'total_earned', coalesce(v_wallet.total_earned, 0),
    'allow_negative', coalesce(v_wallet.allow_negative, false),
    'updated_at', v_wallet.updated_at,
    'program_enabled', public._referral_program_active(),
    'reward_amount', public._referral_reward_amount()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resident_credit_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_credit_summary() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_my_credit_transactions(_limit int DEFAULT 50)
RETURNS SETOF public.resident_credit_transactions
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
  RETURN QUERY
    SELECT *
    FROM public.resident_credit_transactions
    WHERE user_id = v_user
    ORDER BY created_at DESC
    LIMIT greatest(1, least(coalesce(_limit, 50), 200));
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_credit_transactions(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_credit_transactions(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_my_referrals()
RETURNS SETOF public.supplier_referrals
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
  RETURN QUERY
    SELECT *
    FROM public.supplier_referrals
    WHERE referrer_user_id = v_user
    ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_referrals() TO authenticated, service_role;

-- Attach referral when a supplier signs up with a code
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

REVOKE ALL ON FUNCTION public.attach_referral_on_supplier_signup(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_referral_on_supplier_signup(text, uuid) TO authenticated, service_role;

-- Advance referral status (called from onboarding / approval flows)
CREATE OR REPLACE FUNCTION public.advance_referral_for_supplier(
  _supplier_id uuid,
  _to_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.supplier_referrals%ROWTYPE;
  v_from text;
  v_allowed boolean := false;
BEGIN
  IF _to_status IS NULL OR _to_status NOT IN (
    'registered','onboarding_completed','pending_approval','approved','rejected','cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  SELECT * INTO v_ref
  FROM public.supplier_referrals
  WHERE invitee_supplier_id = _supplier_id
  LIMIT 1;

  IF v_ref.id IS NULL THEN
    -- Try link by supplier.user_id if referral was attached before supplier row existed
    UPDATE public.supplier_referrals r
    SET invitee_supplier_id = _supplier_id,
        updated_at = now()
    FROM public.suppliers s
    WHERE s.id = _supplier_id
      AND r.invitee_user_id = s.user_id
      AND r.invitee_supplier_id IS NULL;

    SELECT * INTO v_ref
    FROM public.supplier_referrals
    WHERE invitee_supplier_id = _supplier_id
    LIMIT 1;
  END IF;

  IF v_ref.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'referral_not_found');
  END IF;

  IF v_ref.status IN ('reward_granted', 'cancelled') THEN
    RETURN jsonb_build_object('ok', true, 'status', v_ref.status, 'skipped', true);
  END IF;

  v_from := v_ref.status;

  -- Monotonic-ish progression; allow reject/cancel anytime before reward
  IF _to_status IN ('rejected', 'cancelled') THEN
    v_allowed := true;
  ELSIF _to_status = 'onboarding_completed' AND v_from IN ('invited','registered') THEN
    v_allowed := true;
  ELSIF _to_status = 'pending_approval' AND v_from IN ('invited','registered','onboarding_completed') THEN
    v_allowed := true;
  ELSIF _to_status = 'approved' AND v_from IN ('invited','registered','onboarding_completed','pending_approval') THEN
    v_allowed := true;
  ELSIF _to_status = v_from THEN
    RETURN jsonb_build_object('ok', true, 'status', v_from, 'skipped', true);
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition', 'from', v_from, 'to', _to_status);
  END IF;

  UPDATE public.supplier_referrals
  SET status = _to_status, updated_at = now()
  WHERE id = v_ref.id;

  PERFORM public._write_referral_audit(
    v_ref.id, auth.uid(), 'status_advanced', v_from, _to_status, '{}'::jsonb
  );

  RETURN jsonb_build_object('ok', true, 'referral_id', v_ref.id, 'status', _to_status);
END;
$$;

REVOKE ALL ON FUNCTION public.advance_referral_for_supplier(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_referral_for_supplier(uuid, text) TO authenticated, service_role;

-- Idempotent reward grant
CREATE OR REPLACE FUNCTION public.grant_referral_reward(_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.supplier_referrals%ROWTYPE;
  v_amount numeric;
  v_tx_id uuid;
  v_supplier public.suppliers%ROWTYPE;
  v_idem text;
BEGIN
  SELECT * INTO v_ref FROM public.supplier_referrals WHERE id = _referral_id FOR UPDATE;
  IF v_ref.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_ref.status = 'reward_granted' THEN
    RETURN jsonb_build_object('ok', true, 'already_granted', true, 'transaction_id', v_ref.reward_transaction_id);
  END IF;

  IF v_ref.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelled');
  END IF;

  IF v_ref.fraud_flag THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fraud_flag');
  END IF;

  IF v_ref.duplicate_suspicion THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate_suspicion');
  END IF;

  IF NOT public._referral_program_active() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'program_disabled');
  END IF;

  IF v_ref.invitee_supplier_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_supplier');
  END IF;

  SELECT * INTO v_supplier FROM public.suppliers WHERE id = v_ref.invitee_supplier_id;
  IF v_supplier.id IS NULL OR coalesce(v_supplier.is_deleted, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'supplier_missing');
  END IF;

  IF v_supplier.approval_status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_approved');
  END IF;

  -- Self-referral re-check
  IF v_ref.referrer_user_id = v_ref.invitee_user_id
     OR v_ref.referrer_user_id = v_supplier.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  -- One reward per invitee supplier forever
  IF EXISTS (
    SELECT 1 FROM public.supplier_referrals
    WHERE invitee_supplier_id = v_ref.invitee_supplier_id
      AND status = 'reward_granted'
      AND id <> v_ref.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_rewarded_elsewhere');
  END IF;

  v_amount := public._referral_reward_amount();
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_reward_amount');
  END IF;

  v_idem := 'referral_reward:' || v_ref.id::text;

  IF EXISTS (
    SELECT 1 FROM public.resident_credit_transactions WHERE idempotency_key = v_idem
  ) THEN
    SELECT id INTO v_tx_id FROM public.resident_credit_transactions WHERE idempotency_key = v_idem;
    UPDATE public.supplier_referrals
    SET status = 'reward_granted',
        reward_amount = v_amount,
        reward_granted_at = coalesce(reward_granted_at, now()),
        reward_transaction_id = v_tx_id,
        updated_at = now()
    WHERE id = v_ref.id;
    RETURN jsonb_build_object('ok', true, 'already_granted', true, 'transaction_id', v_tx_id);
  END IF;

  PERFORM public._ensure_credit_wallet(v_ref.referrer_user_id);

  INSERT INTO public.resident_credit_transactions (
    user_id, amount, type, source, referral_id, status, description, idempotency_key, created_by
  ) VALUES (
    v_ref.referrer_user_id,
    v_amount,
    'referral_reward',
    'supplier_referral',
    v_ref.id,
    'posted',
    'קרדיט על הפניית ספק שאושר',
    v_idem,
    auth.uid()
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.resident_credit_wallets
  SET available_balance = available_balance + v_amount,
      total_earned = total_earned + v_amount,
      updated_at = now()
  WHERE user_id = v_ref.referrer_user_id;

  UPDATE public.supplier_referrals
  SET status = 'reward_granted',
      reward_amount = v_amount,
      reward_granted_at = now(),
      reward_transaction_id = v_tx_id,
      updated_at = now()
  WHERE id = v_ref.id;

  PERFORM public._write_referral_audit(
    v_ref.id, auth.uid(), 'reward_granted', v_ref.status, 'reward_granted',
    jsonb_build_object('amount', v_amount, 'transaction_id', v_tx_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', v_tx_id,
    'amount', v_amount,
    'referrer_user_id', v_ref.referrer_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward(uuid) TO authenticated, service_role;

-- Approve supplier + advance referral + grant reward (single admin entrypoint)
CREATE OR REPLACE FUNCTION public.admin_approve_supplier(_supplier_id uuid, _approve boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ref_id uuid;
  v_grant jsonb;
  v_advance jsonb;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _approve THEN
    UPDATE public.suppliers
    SET approval_status = 'approved', is_active = true
    WHERE id = _supplier_id;

    v_advance := public.advance_referral_for_supplier(_supplier_id, 'approved');

    SELECT id INTO v_ref_id
    FROM public.supplier_referrals
    WHERE invitee_supplier_id = _supplier_id
    LIMIT 1;

    IF v_ref_id IS NOT NULL THEN
      v_grant := public.grant_referral_reward(v_ref_id);
    ELSE
      v_grant := jsonb_build_object('ok', false, 'error', 'no_referral');
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'approval_status', 'approved',
      'advance', v_advance,
      'grant', v_grant,
      'referral_id', v_ref_id
    );
  ELSE
    UPDATE public.suppliers
    SET approval_status = 'rejected'
    WHERE id = _supplier_id;

    v_advance := public.advance_referral_for_supplier(_supplier_id, 'rejected');
    RETURN jsonb_build_object('ok', true, 'approval_status', 'rejected', 'advance', v_advance);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_supplier(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_supplier(uuid, boolean) TO authenticated, service_role;

-- Mark reward notification sent (idempotent claim)
CREATE OR REPLACE FUNCTION public.claim_referral_reward_notification(_referral_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed uuid;
BEGIN
  UPDATE public.supplier_referrals
  SET reward_notified_at = now()
  WHERE id = _referral_id
    AND status = 'reward_granted'
    AND reward_notified_at IS NULL
  RETURNING id INTO v_claimed;
  RETURN v_claimed IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_reward_notification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward_notification(uuid) TO authenticated, service_role;

-- Admin cancel / reverse
CREATE OR REPLACE FUNCTION public.admin_cancel_referral(
  _referral_id uuid,
  _reason text,
  _reverse_unused_credit boolean DEFAULT true,
  _allow_negative boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ref public.supplier_referrals%ROWTYPE;
  v_from text;
  v_wallet public.resident_credit_wallets%ROWTYPE;
  v_unused numeric := 0;
  v_tx_id uuid;
  v_amount numeric;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_ref FROM public.supplier_referrals WHERE id = _referral_id FOR UPDATE;
  IF v_ref.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  v_from := v_ref.status;
  v_amount := coalesce(v_ref.reward_amount, 0);

  UPDATE public.supplier_referrals
  SET status = 'cancelled',
      cancelled_reason = btrim(coalesce(_reason, '')),
      fraud_flag = true,
      updated_at = now()
  WHERE id = _referral_id;

  IF v_from = 'reward_granted' AND _reverse_unused_credit AND v_amount > 0 THEN
    PERFORM public._ensure_credit_wallet(v_ref.referrer_user_id);
    SELECT * INTO v_wallet FROM public.resident_credit_wallets WHERE user_id = v_ref.referrer_user_id FOR UPDATE;
    v_unused := least(v_wallet.available_balance, v_amount);

    IF v_unused > 0 THEN
      INSERT INTO public.resident_credit_transactions (
        user_id, amount, type, source, referral_id, status, description, idempotency_key, created_by
      ) VALUES (
        v_ref.referrer_user_id,
        -v_unused,
        'reversal',
        'admin_cancel_referral',
        v_ref.id,
        'posted',
        'ביטול קרדיט הפניה',
        'referral_reversal:' || v_ref.id::text || ':' || v_unused::text,
        v_caller
      )
      RETURNING id INTO v_tx_id;

      UPDATE public.resident_credit_wallets
      SET available_balance = available_balance - v_unused,
          updated_at = now()
      WHERE user_id = v_ref.referrer_user_id;
    END IF;

    -- If credit already spent and admin explicitly allows negative
    IF v_unused < v_amount AND _allow_negative THEN
      UPDATE public.resident_credit_wallets
      SET allow_negative = true,
          available_balance = available_balance - (v_amount - v_unused),
          updated_at = now()
      WHERE user_id = v_ref.referrer_user_id;

      INSERT INTO public.resident_credit_transactions (
        user_id, amount, type, source, referral_id, status, description, idempotency_key, created_by
      ) VALUES (
        v_ref.referrer_user_id,
        -(v_amount - v_unused),
        'reversal',
        'admin_cancel_referral_negative',
        v_ref.id,
        'posted',
        'ביטול קרדיט שנוצל — יתרה שלילית באישור אדמין',
        'referral_reversal_neg:' || v_ref.id::text,
        v_caller
      );
    END IF;
  END IF;

  PERFORM public._write_referral_audit(
    v_ref.id, v_caller, 'cancelled', v_from, 'cancelled',
    jsonb_build_object('reason', _reason, 'reversed', v_unused, 'allow_negative', _allow_negative)
  );

  RETURN jsonb_build_object('ok', true, 'reversed_amount', coalesce(v_unused, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_referral(uuid, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_referral(uuid, text, boolean, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_manual_grant_referral_reward(_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Clear soft blocks that admin explicitly overrides
  UPDATE public.supplier_referrals
  SET duplicate_suspicion = false,
      fraud_flag = false,
      status = CASE WHEN status IN ('cancelled', 'rejected') THEN 'approved' ELSE status END,
      updated_at = now()
  WHERE id = _referral_id;

  -- Ensure supplier is approved path
  UPDATE public.supplier_referrals r
  SET status = 'approved'
  WHERE r.id = _referral_id
    AND r.status NOT IN ('reward_granted', 'approved');

  RETURN public.grant_referral_reward(_referral_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_grant_referral_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manual_grant_referral_reward(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_referral_program_settings(
  _enabled boolean,
  _reward_amount numeric,
  _starts_at timestamptz DEFAULT NULL,
  _ends_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _reward_amount IS NULL OR _reward_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT id INTO v_id FROM public.system_settings ORDER BY created_at NULLS LAST LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'system_settings_missing';
  END IF;

  UPDATE public.system_settings
  SET supplier_referral_program_enabled = coalesce(_enabled, true),
      supplier_referral_reward_amount = _reward_amount,
      supplier_referral_program_starts_at = _starts_at,
      supplier_referral_program_ends_at = _ends_at,
      updated_at = now()
  WHERE id = v_id;

  INSERT INTO public.supplier_referral_audit_log (referral_id, actor_id, action, metadata)
  VALUES (
    NULL, v_caller, 'settings_updated',
    jsonb_build_object(
      'enabled', _enabled,
      'reward_amount', _reward_amount,
      'starts_at', _starts_at,
      'ends_at', _ends_at
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'enabled', _enabled,
    'reward_amount', _reward_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_referral_program_settings(boolean, numeric, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_referral_program_settings(boolean, numeric, timestamptz, timestamptz) TO authenticated, service_role;

-- =============================================================================
-- Credit payment RPCs (used by create-deposit / refunds via service_role)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_credit_for_deposit(
  _user_id uuid,
  _deal_id uuid,
  _deposit_id uuid,
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.resident_credit_wallets%ROWTYPE;
  v_tx_id uuid;
  v_idem text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'credit_amount', 0, 'transaction_id', NULL);
  END IF;

  v_idem := 'credit_reserve:' || _deposit_id::text;

  -- Only treat an active reservation as already done.
  IF EXISTS (
    SELECT 1 FROM public.resident_credit_transactions
    WHERE idempotency_key = v_idem AND status = 'pending_reserve'
  ) THEN
    SELECT id, abs(amount) INTO v_tx_id, _amount
    FROM public.resident_credit_transactions
    WHERE idempotency_key = v_idem AND status = 'pending_reserve';
    RETURN jsonb_build_object('ok', true, 'credit_amount', _amount, 'transaction_id', v_tx_id, 'already', true);
  END IF;

  -- Clear stale reversed keys so a fresh reserve can reuse the stable key.
  UPDATE public.resident_credit_transactions
  SET idempotency_key = idempotency_key || ':released:' || id::text
  WHERE idempotency_key = v_idem
    AND status = 'reversed';

  PERFORM public._ensure_credit_wallet(_user_id);
  SELECT * INTO v_wallet FROM public.resident_credit_wallets WHERE user_id = _user_id FOR UPDATE;

  IF v_wallet.available_balance < _amount AND NOT v_wallet.allow_negative THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credit', 'available', v_wallet.available_balance);
  END IF;

  UPDATE public.resident_credit_wallets
  SET available_balance = available_balance - _amount,
      used_balance = used_balance + _amount,
      updated_at = now()
  WHERE user_id = _user_id
    AND (available_balance >= _amount OR allow_negative);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credit');
  END IF;

  INSERT INTO public.resident_credit_transactions (
    user_id, amount, type, source, deal_id, deposit_id, status, description, idempotency_key
  ) VALUES (
    _user_id, -_amount, 'deal_join_payment', 'participation_fee',
    _deal_id, _deposit_id, 'pending_reserve',
    'שמירת קרדיט לתשלום דמי השתתפות',
    v_idem
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.deposits
  SET credit_amount = _amount,
      credit_transaction_id = v_tx_id
  WHERE id = _deposit_id;

  RETURN jsonb_build_object('ok', true, 'credit_amount', _amount, 'transaction_id', v_tx_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credit_for_deposit(uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credit_for_deposit(uuid, uuid, uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_credit_for_deposit(_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resident_credit_transactions
  SET status = 'posted'
  WHERE deposit_id = _deposit_id
    AND status = 'pending_reserve'
    AND type = 'deal_join_payment';

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_credit_for_deposit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_credit_for_deposit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.release_credit_reservation(_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.resident_credit_transactions%ROWTYPE;
  v_amount numeric;
BEGIN
  SELECT * INTO v_tx
  FROM public.resident_credit_transactions
  WHERE deposit_id = _deposit_id
    AND type = 'deal_join_payment'
    AND status = 'pending_reserve'
  FOR UPDATE;

  IF v_tx.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'released', 0);
  END IF;

  v_amount := abs(v_tx.amount);

  UPDATE public.resident_credit_wallets
  SET available_balance = available_balance + v_amount,
      used_balance = greatest(0, used_balance - v_amount),
      updated_at = now()
  WHERE user_id = v_tx.user_id;

  UPDATE public.resident_credit_transactions
  SET status = 'reversed'
  WHERE id = v_tx.id;

  UPDATE public.deposits
  SET credit_amount = 0,
      credit_transaction_id = NULL
  WHERE id = _deposit_id
    AND status IN ('pending', 'awaiting_confirmation', 'failed', 'expired', 'cancelled');

  RETURN jsonb_build_object('ok', true, 'released', v_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.release_credit_reservation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_credit_reservation(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_credit_for_deposit(_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep record;
  v_amount numeric;
  v_idem text;
  v_tx_id uuid;
BEGIN
  SELECT id, user_id, deal_id, credit_amount, status
  INTO v_dep
  FROM public.deposits
  WHERE id = _deposit_id
  FOR UPDATE;

  IF v_dep.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  v_amount := coalesce(v_dep.credit_amount, 0);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'refunded', 0);
  END IF;

  v_idem := 'credit_refund:' || _deposit_id::text;
  IF EXISTS (SELECT 1 FROM public.resident_credit_transactions WHERE idempotency_key = v_idem) THEN
    RETURN jsonb_build_object('ok', true, 'refunded', v_amount, 'already', true);
  END IF;

  PERFORM public._ensure_credit_wallet(v_dep.user_id);

  INSERT INTO public.resident_credit_transactions (
    user_id, amount, type, source, deal_id, deposit_id, status, description, idempotency_key
  ) VALUES (
    v_dep.user_id, v_amount, 'reversal', 'deal_refund',
    v_dep.deal_id, _deposit_id, 'posted',
    'החזרת קרדיט בעקבות ביטול עסקה',
    v_idem
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.resident_credit_wallets
  SET available_balance = available_balance + v_amount,
      used_balance = greatest(0, used_balance - v_amount),
      updated_at = now()
  WHERE user_id = v_dep.user_id;

  -- Mark original spend as reversed if present
  UPDATE public.resident_credit_transactions
  SET status = 'reversed'
  WHERE deposit_id = _deposit_id
    AND type = 'deal_join_payment'
    AND status IN ('posted', 'pending_reserve');

  RETURN jsonb_build_object('ok', true, 'refunded', v_amount, 'transaction_id', v_tx_id);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credit_for_deposit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit_for_deposit(uuid) TO service_role;

-- Trigger: when supplier onboarding saved / approval changes via direct update,
-- keep referral in sync when possible.
CREATE OR REPLACE FUNCTION public.trg_supplier_referral_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_complete boolean;
BEGIN
  -- Link referral by user_id if needed
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.supplier_referrals
    SET invitee_supplier_id = NEW.id,
        invitee_email = coalesce(invitee_email, NEW.email),
        invitee_phone = coalesce(invitee_phone, NEW.phone),
        updated_at = now()
    WHERE invitee_user_id = NEW.user_id
      AND invitee_supplier_id IS NULL;
  END IF;

  v_complete := (
    coalesce(btrim(NEW.business_name), '') <> ''
    AND coalesce(btrim(NEW.phone), '') <> ''
    AND length(coalesce(btrim(NEW.description), btrim(NEW.short_description), '')) >= 10
  );

  IF NEW.approval_status IN ('approved', 'active')
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    PERFORM public.advance_referral_for_supplier(NEW.id, 'approved');
  ELSIF NEW.approval_status = 'rejected'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    PERFORM public.advance_referral_for_supplier(NEW.id, 'rejected');
  ELSIF v_complete THEN
    PERFORM public.advance_referral_for_supplier(NEW.id, 'pending_approval');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_referral_sync ON public.suppliers;
CREATE TRIGGER trg_supplier_referral_sync
  AFTER INSERT OR UPDATE OF approval_status, business_name, phone, description, short_description, user_id, email
  ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_supplier_referral_sync();
