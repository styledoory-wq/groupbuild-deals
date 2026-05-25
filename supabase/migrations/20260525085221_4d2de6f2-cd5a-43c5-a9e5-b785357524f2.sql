
-- ============ BUG FIX: schema-qualify gen_random_bytes ============
CREATE OR REPLACE FUNCTION public.issue_vouchers_for_deal(_deal_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_code := upper(substring(encode(extensions.gen_random_bytes(6),'hex') for 8));
    v_ref  := 'GB-' || to_char(now(),'YYMMDD') || '-' || upper(substring(encode(extensions.gen_random_bytes(4),'hex') for 6));
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
$function$;

-- ============ QA SEED + E2E TESTS ============
DO $$
DECLARE
  v_verified uuid := 'c13d6a6c-04de-41fb-9a6c-49eebefb8507';
  v_unverified uuid := '846e3ccd-867b-48d9-a31c-9a35c3e83960';
  v_r1 uuid := '400bafe9-2914-402a-a7fc-3e3c25c8ec3a';
  v_r2 uuid := 'a9a8863f-00b7-42c2-9125-eba5d6422f72';
  v_r3 uuid := '59b5bb98-f267-4c87-a59b-49a372bcd84a';
  v_sup_user uuid;
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_vc int; v_ac timestamptz; v_code text; v_st text;
  v_pass int := 0; v_fail int := 0;
BEGIN
  UPDATE public.suppliers SET verified_supplier=true, trust_score=85, successful_redemptions=12, complaints_count=0 WHERE id=v_verified;
  UPDATE public.suppliers SET verified_supplier=false, trust_score=35, is_suspended=false, complaints_count=2 WHERE id=v_unverified;

  INSERT INTO public.deals (id, supplier_id, title, description, project_id,
    original_price, discounted_price, offer_type, status, is_demo,
    target_participants, join_deadline, redemption_deadline,
    supplier_commitment_accepted, appointment_required, service_areas, offer_terms,
    deposit_required, deposit_amount, visibility_type)
  VALUES
    (v_a, v_verified,'[DEMO] שיפוץ מטבח קבוצתי','דוגמת QA — הצעה פעילה',NULL,
     35000,28000,'price_comparison','active',true,
     10, now()+interval '14 days', now()+interval '60 days',
     true,true,ARRAY['תל אביב','רמת גן']::text[],'תקף ביחידות מעל 80 מ"ר.',true,500,'public'),
    (v_b, v_verified,'[DEMO] התקנת מזגנים — כמעט נסגר','דוגמת QA',NULL,
     8900,6900,'price_comparison','active',true,
     3, now()+interval '7 days', now()+interval '45 days',
     true,true,ARRAY['כל הארץ']::text[],'מחיר ליחידה. התקנה תוך 21 יום.',true,300,'public'),
    (v_c, v_verified,'[DEMO] דלת פלדה — סגור עם שוברים','דוגמת QA',NULL,
     4500,3200,'price_comparison','active',true,
     2, now()+interval '30 days', now()+interval '90 days',
     true,false,ARRAY['גוש דן']::text[],'הובלה והתקנה כלולים.',true,200,'public');

  ALTER TABLE public.deposits DISABLE TRIGGER trg_enforce_deposit_integrity;

  INSERT INTO public.deal_interests (user_id, deal_id, status, lead_status, deposit_status, deposit_amount, deposit_required, is_demo) VALUES
    (v_r1, v_a::text,'paid','approved','paid',500,true,true),
    (v_r2, v_a::text,'paid','approved','paid',500,true,true),
    (v_r1, v_b::text,'paid','approved','paid',300,true,true),
    (v_r2, v_b::text,'paid','approved','paid',300,true,true),
    (v_r1, v_c::text,'paid','approved','paid',200,true,true),
    (v_r3, v_c::text,'paid','approved','paid',200,true,true);

  INSERT INTO public.deposits (user_id, deal_id, amount, payment_provider, status, paid_at, is_demo) VALUES
    (v_r1, v_a::text,500,'grow','paid', now(), true),
    (v_r2, v_a::text,500,'grow','paid', now(), true),
    (v_r1, v_b::text,300,'grow','paid', now(), true),
    (v_r2, v_b::text,300,'grow','paid', now(), true);

  INSERT INTO public.deposits (user_id, deal_id, amount, payment_provider, status, paid_at, is_demo)
  VALUES (v_r1, v_c::text,200,'grow','paid', now(), true);
  SELECT auto_closed_at INTO v_ac FROM public.deals WHERE id=v_c;
  IF v_ac IS NULL THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] 1/2 not closed';
  ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] closed early'; END IF;

  INSERT INTO public.deposits (user_id, deal_id, amount, payment_provider, status, paid_at, is_demo)
  VALUES (v_r3, v_c::text,200,'grow','paid', now(), true);
  SELECT auto_closed_at, status INTO v_ac, v_st FROM public.deals WHERE id=v_c;
  IF v_ac IS NOT NULL AND v_st='closed' THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] auto-close (%, %)',v_st,v_ac;
  ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] no auto-close (%, %)',v_st,v_ac; END IF;

  SELECT count(*) INTO v_vc FROM public.vouchers WHERE deal_id=v_c::text;
  IF v_vc=2 THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] 2 vouchers issued';
  ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] expected 2 vouchers, got %', v_vc; END IF;

  PERFORM public.issue_vouchers_for_deal(v_c::text);
  SELECT count(*) INTO v_vc FROM public.vouchers WHERE deal_id=v_c::text;
  IF v_vc=2 THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] idempotent';
  ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] duplicates: %', v_vc; END IF;

  SELECT user_id INTO v_sup_user FROM public.suppliers WHERE id=v_verified;
  PERFORM set_config('request.jwt.claim.sub', v_sup_user::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_sup_user::text,'role','authenticated')::text, true);
  SELECT code INTO v_code FROM public.vouchers WHERE deal_id=v_c::text AND status='eligible' LIMIT 1;
  BEGIN
    PERFORM public.redeem_voucher(v_code);
    v_pass:=v_pass+1; RAISE NOTICE '[PASS] redeem ok (%)', v_code;
  EXCEPTION WHEN OTHERS THEN v_fail:=v_fail+1; RAISE WARNING '[FAIL] redeem: %', SQLERRM; END;

  BEGIN
    PERFORM public.redeem_voucher(v_code);
    v_fail:=v_fail+1; RAISE WARNING '[FAIL] dup redeem allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%already_redeemed%' THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] dup redeem blocked';
    ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] dup err: %', SQLERRM; END IF;
  END;

  SELECT user_id INTO v_sup_user FROM public.suppliers WHERE id=v_unverified;
  PERFORM set_config('request.jwt.claim.sub', v_sup_user::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_sup_user::text,'role','authenticated')::text, true);
  SELECT code INTO v_code FROM public.vouchers WHERE deal_id=v_c::text AND status='eligible' LIMIT 1;
  IF v_code IS NOT NULL THEN
    BEGIN
      PERFORM public.redeem_voucher(v_code);
      v_fail:=v_fail+1; RAISE WARNING '[FAIL] cross-supplier allowed';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM ILIKE '%wrong_supplier%' THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] wrong-supplier blocked';
      ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] cs err: %', SQLERRM; END IF;
    END;
  END IF;

  SELECT user_id INTO v_sup_user FROM public.suppliers WHERE id=v_verified;
  PERFORM set_config('request.jwt.claim.sub', v_sup_user::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_sup_user::text,'role','authenticated')::text, true);
  BEGIN
    UPDATE public.deals SET discounted_price=9999 WHERE id=v_c;
    v_fail:=v_fail+1; RAISE WARNING '[FAIL] post-close pricing change allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%auto-closed%' THEN v_pass:=v_pass+1; RAISE NOTICE '[PASS] post-close pricing locked';
    ELSE v_fail:=v_fail+1; RAISE WARNING '[FAIL] lock err: %', SQLERRM; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','',true);

  INSERT INTO public.complaints (user_id, deal_id, supplier_id, issue_type, description, status) VALUES
    (v_r1, v_a::text, v_verified,'איחור בתיאום פגישה','עברו 5 ימים ועדיין לא קיבלתי תיאום מהספק.','open'),
    (v_r2, v_b::text, v_unverified,'מחיר לא תואם פרסום','הספק דרש סכום גבוה יותר ממה שהוצג בהצעה.','in_review');

  ALTER TABLE public.deposits ENABLE TRIGGER trg_enforce_deposit_integrity;

  RAISE NOTICE '======== QA SUMMARY: % PASS, % FAIL ========', v_pass, v_fail;
END $$;
