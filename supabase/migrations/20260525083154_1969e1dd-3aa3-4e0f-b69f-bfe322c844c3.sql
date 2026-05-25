
-- ============ 1. EXTEND deals ============
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS target_participants integer,
  ADD COLUMN IF NOT EXISTS join_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS redemption_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS appointment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_terms text,
  ADD COLUMN IF NOT EXISTS max_redemptions integer,
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS auto_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_commitment_accepted boolean NOT NULL DEFAULT false;

-- ============ 2. EXTEND suppliers ============
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_supplier boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complaints_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- ============ 3. VOUCHERS ============
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  reference_number text NOT NULL UNIQUE,
  rotation_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'eligible',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_supplier_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_status_chk CHECK (status IN
    ('eligible','appointment','measured','ordered','installed','completed','redeemed','expired','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON public.vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_deal ON public.vouchers(deal_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_supplier ON public.vouchers(supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_voucher_user_deal ON public.vouchers(user_id, deal_id);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vouchers" ON public.vouchers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Suppliers view own vouchers" ON public.vouchers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = vouchers.supplier_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Admins manage all vouchers" ON public.vouchers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Suppliers update own vouchers status" ON public.vouchers
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = vouchers.supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = vouchers.supplier_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_vouchers_updated_at BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. VOUCHER AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.voucher_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid,
  actor_id uuid,
  action text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vauditlog_voucher ON public.voucher_audit_log(voucher_id);
ALTER TABLE public.voucher_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.voucher_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own voucher audit" ON public.voucher_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vouchers v WHERE v.id = voucher_audit_log.voucher_id AND v.user_id = auth.uid()));
CREATE POLICY "Suppliers view own voucher audit" ON public.voucher_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vouchers v JOIN public.suppliers s ON s.id = v.supplier_id
    WHERE v.id = voucher_audit_log.voucher_id AND s.user_id = auth.uid()
  ));

-- ============ 5. COMPLAINTS ============
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id text,
  supplier_id uuid,
  voucher_id uuid,
  issue_type text NOT NULL,
  description text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT complaints_status_chk CHECK (status IN ('open','in_review','resolved','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_supplier ON public.complaints(supplier_id);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own complaints" ON public.complaints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all complaints" ON public.complaints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 6. AUTO-CLOSE DEAL + ISSUE VOUCHERS ============
CREATE OR REPLACE FUNCTION public.issue_vouchers_for_deal(_deal_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_count int := 0;
  v_row RECORD;
  v_code text;
  v_ref text;
BEGIN
  SELECT id, supplier_id, redemption_deadline INTO v_deal
  FROM public.deals WHERE id::text = _deal_id LIMIT 1;
  IF v_deal.id IS NULL THEN RETURN 0; END IF;

  FOR v_row IN
    SELECT DISTINCT user_id FROM public.deposits
    WHERE deal_id = _deal_id AND status = 'paid'::deposit_status
      AND COALESCE(is_deleted,false) = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.vouchers WHERE deal_id = _deal_id AND user_id = v_row.user_id) THEN
      CONTINUE;
    END IF;
    v_code := upper(substring(encode(gen_random_bytes(6),'hex') for 8));
    v_ref := 'GB-' || to_char(now(),'YYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4),'hex') for 6));
    INSERT INTO public.vouchers (deal_id, user_id, supplier_id, code, reference_number, expires_at, status)
    VALUES (_deal_id, v_row.user_id, v_deal.supplier_id, v_code, v_ref,
            COALESCE(v_deal.redemption_deadline, now() + interval '90 days'), 'eligible');
    INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
    SELECT id, NULL, 'issued', jsonb_build_object('deal_id', _deal_id)
    FROM public.vouchers WHERE deal_id = _deal_id AND user_id = v_row.user_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_auto_close_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_paid int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT id, target_participants, status, auto_closed_at INTO v_deal
  FROM public.deals WHERE id::text = NEW.deal_id LIMIT 1;
  IF v_deal.id IS NULL OR v_deal.target_participants IS NULL OR v_deal.auto_closed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'paid'::deposit_status THEN RETURN NEW; END IF;

  v_paid := public.get_deal_paid_count(NEW.deal_id);
  IF v_paid >= v_deal.target_participants THEN
    UPDATE public.deals SET status = 'closed', auto_closed_at = now() WHERE id = v_deal.id;
    PERFORM public.issue_vouchers_for_deal(NEW.deal_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deposits_auto_close_deal ON public.deposits;
CREATE TRIGGER deposits_auto_close_deal
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_close_deal();

-- ============ 7. LOCK CLOSED DEAL FIELDS ============
CREATE OR REPLACE FUNCTION public.lock_closed_deal_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.auto_closed_at IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.original_price IS DISTINCT FROM OLD.original_price
    OR NEW.discounted_price IS DISTINCT FROM OLD.discounted_price
    OR NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage
    OR NEW.tiers::text IS DISTINCT FROM OLD.tiers::text
    OR NEW.offer_terms IS DISTINCT FROM OLD.offer_terms
    OR NEW.target_participants IS DISTINCT FROM OLD.target_participants
    OR NEW.max_redemptions IS DISTINCT FROM OLD.max_redemptions
  THEN
    RAISE EXCEPTION 'Cannot modify pricing/terms after deal has auto-closed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS deals_lock_closed ON public.deals;
CREATE TRIGGER deals_lock_closed
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.lock_closed_deal_fields();

-- ============ 8. REDEEM VOUCHER FN ============
CREATE OR REPLACE FUNCTION public.redeem_voucher(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher public.vouchers%ROWTYPE;
  v_supplier_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT id INTO v_supplier_id FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1;
  IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'not_supplier'; END IF;

  SELECT * INTO v_voucher FROM public.vouchers WHERE code = upper(_code) LIMIT 1;
  IF v_voucher.id IS NULL THEN
    INSERT INTO public.voucher_audit_log (actor_id, action, metadata)
    VALUES (auth.uid(), 'failed', jsonb_build_object('reason','not_found','code',_code));
    RAISE EXCEPTION 'voucher_not_found';
  END IF;

  IF v_voucher.supplier_id <> v_supplier_id THEN
    INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
    VALUES (v_voucher.id, auth.uid(), 'failed', jsonb_build_object('reason','wrong_supplier'));
    RAISE EXCEPTION 'wrong_supplier';
  END IF;

  IF v_voucher.status = 'redeemed' THEN
    INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
    VALUES (v_voucher.id, auth.uid(), 'duplicate_attempt', '{}'::jsonb);
    RAISE EXCEPTION 'already_redeemed';
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
    UPDATE public.vouchers SET status = 'expired' WHERE id = v_voucher.id;
    RAISE EXCEPTION 'expired';
  END IF;

  UPDATE public.vouchers
  SET status = 'redeemed', redeemed_at = now(), redeemed_by_supplier_id = v_supplier_id
  WHERE id = v_voucher.id;

  UPDATE public.suppliers
  SET successful_redemptions = successful_redemptions + 1
  WHERE id = v_supplier_id;

  INSERT INTO public.voucher_audit_log (voucher_id, actor_id, action, metadata)
  VALUES (v_voucher.id, auth.uid(), 'redeemed', jsonb_build_object('supplier_id', v_supplier_id));

  RETURN jsonb_build_object('success', true, 'voucher_id', v_voucher.id, 'reference_number', v_voucher.reference_number);
END;
$$;

-- ============ 9. COMPLAINT COUNTER TRIGGER ============
CREATE OR REPLACE FUNCTION public.trg_inc_complaint_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL THEN
    UPDATE public.suppliers SET complaints_count = complaints_count + 1 WHERE id = NEW.supplier_id;
  END IF;
  PERFORM public.notify_admins('תלונה חדשה', NEW.issue_type, 'system', '/admin/complaints',
    jsonb_build_object('complaint_id', NEW.id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS complaints_inc_count ON public.complaints;
CREATE TRIGGER complaints_inc_count AFTER INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.trg_inc_complaint_count();
