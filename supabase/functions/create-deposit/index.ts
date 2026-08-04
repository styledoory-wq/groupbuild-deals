import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CARDCOM_API_BASE,
  getCardcomCredentials,
  getCardcomWebhookSecret,
  getPaymentEnvironment,
  getSiteOrigin,
  getStripeSecretKey,
  providerIsReady,
  SUPPORTED_PROVIDERS,
  type PaymentEnvironment,
  type SupportedProvider,
} from "../_shared/paymentEnv.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * create-deposit — participation fee checkout.
 *
 * Guarantees:
 *  1. FAIL CLOSED — any failure to resolve a positive fee blocks the join.
 *     There is no fee = 0 path and no "free join" fallback.
 *  2. NO deal_interest is created here. The join record is created only by the
 *     payment webhook, after the payment is confirmed.
 *  3. The fee is LOCKED ATOMICALLY on the deal at the first checkout, so every
 *     participant of a deal pays exactly the same amount.
 *  4. When PARTICIPATION_FEES_ENFORCED is off, joining is BLOCKED (never free).
 */

interface CreateDepositBody {
  deal_id?: string;
  participant_count?: number;
  join_payload?: Record<string, unknown>;
  /** Optional: how much credit the client wants to apply. Server caps by balance + fee. */
  credit_to_apply?: number;
}

const BLOCKED_MESSAGE = "ההצטרפות לעסקה אינה זמינה כרגע. נסו שוב מאוחר יותר.";

function enforcementEnabled(): boolean {
  const raw = (Deno.env.get("PARTICIPATION_FEES_ENFORCED") ?? "1").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(raw);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!enforcementEnabled()) {
      // Kill-switch: block joining entirely. Never fall back to a free join.
      return json({ error: "joining_disabled", message: BLOCKED_MESSAGE }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "יש להתחבר כדי להצטרף" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized", message: "המשתמש אינו מחובר" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as CreateDepositBody;
    if (!body?.deal_id || typeof body.deal_id !== "string") {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---------------------------------------------------------------
    // System-wide participation fee mode. Server-side enforcement so the
    // UI cannot be bypassed. FAIL CLOSED when the mode cannot be read.
    // ---------------------------------------------------------------
    const { data: modeData, error: modeErr } = await admin.rpc("get_participation_fee_mode");
    if (modeErr || typeof modeData !== "string") {
      console.error("[create-deposit] participation mode unavailable", modeErr);
      return json({ error: "mode_unavailable", message: BLOCKED_MESSAGE }, 503);
    }
    if (modeData === "maintenance") {
      return json({
        error: "joining_maintenance",
        message: "ההצטרפות לעסקאות אינה זמינה כרגע. נסו שוב מאוחר יותר.",
      }, 503);
    }
    if (modeData === "disabled") {
      // Free-join mode: no deposit may be created at all.
      return json({
        error: "participation_fee_disabled",
        message: "ההצטרפות לעסקאות אינה כרוכה כרגע בתשלום.",
      }, 409);
    }
    if (modeData !== "enabled") {
      return json({ error: "mode_unavailable", message: BLOCKED_MESSAGE }, 503);
    }

    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select(
        "id,title,status,is_deleted,supplier_id,category_id,listing_type,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers," +
          "participation_fee_base_price,participation_fee_rule_id,participation_fee_amount,participation_fee_locked_at",
      )
      .eq("id", body.deal_id)
      .eq("is_deleted", false)
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!deal) return json({ error: "deal_not_found", message: "העסקה לא נמצאה" }, 404);
    if (deal.status !== "active") {
      return json({ error: "deal_not_active", message: "העסקה אינה פעילה" }, 409);
    }

    const listingType = (deal.listing_type ?? "group_buy") as string;
    if (listingType === "regular") {
      return json(
        { error: "fee_not_required", message: "להצעה רגילה לא נדרשים דמי השתתפות" },
        409,
      );
    }

    // ---------------------------------------------------------------
    // Resolve or reuse the LOCKED fee for this deal
    // ---------------------------------------------------------------
    let basePrice: number;
    let feeAmount: number;
    let ruleId: string | null;
    let currency = "ILS";
    let feeSource = "price_band";

    if (deal.participation_fee_locked_at && Number(deal.participation_fee_amount) > 0) {
      basePrice = Number(deal.participation_fee_base_price ?? 0);
      feeAmount = Number(deal.participation_fee_amount);
      ruleId = deal.participation_fee_rule_id ? String(deal.participation_fee_rule_id) : null;
    } else {
      // The system decides automatically: admin price bands when the deal has an
      // unambiguous final price, otherwise the category's fixed amount.
      // The supplier has no influence on the amount.
      const { data: feeRows, error: feeErr } = await admin.rpc(
        "resolve_deal_participation_fee",
        { _deal_id: deal.id },
      );
      if (feeErr) {
        console.error("[create-deposit] resolve_deal_participation_fee failed", feeErr);
        return json({ error: "fee_resolution_failed", message: BLOCKED_MESSAGE }, 503);
      }
      const row = Array.isArray(feeRows) && feeRows.length > 0 ? feeRows[0] : null;
      const resolvedFee = Number(row?.fee_amount ?? 0);
      if (!row || !Number.isFinite(resolvedFee) || resolvedFee <= 0) {
        console.error("[create-deposit] no participation fee configured", {
          deal_id: deal.id,
          reason: row?.reason,
        });
        return json(
          { error: "fee_not_configured", reason: row?.reason ?? null, message: BLOCKED_MESSAGE },
          409,
        );
      }
      const resolvedSource = String(row.source ?? "price_band");
      const resolvedBase = row.base_price == null ? null : Number(row.base_price);

      // Atomic lock — first checkout wins, concurrent callers get the same values.
      const { data: lockRows, error: lockErr } = await admin.rpc(
        "lock_deal_participation_fee",
        {
          _deal_id: deal.id,
          _base_price: resolvedBase,
          _rule_id: row.rule_id ?? null,
          _fee_amount: resolvedFee,
          _source: resolvedSource,
        },
      );
      if (lockErr) {
        console.error("[create-deposit] fee lock failed", lockErr);
        return json({ error: "fee_lock_failed", message: BLOCKED_MESSAGE }, 503);
      }
      const locked = Array.isArray(lockRows) && lockRows.length > 0 ? lockRows[0] : null;
      if (!locked || !(Number(locked.fee_amount) > 0)) {
        return json({ error: "fee_lock_failed", message: BLOCKED_MESSAGE }, 503);
      }
      basePrice = Number(locked.base_price ?? 0);
      feeAmount = Number(locked.fee_amount);
      ruleId = locked.rule_id ? String(locked.rule_id) : null;
      feeSource = String(locked.source ?? resolvedSource);
      currency = row.currency ?? "ILS";
    }


    if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
      return json({ error: "fee_not_configured", message: BLOCKED_MESSAGE }, 409);
    }
    const amount = feeAmount;

    // ---------------------------------------------------------------
    // Credit split (server-authoritative). Client may suggest an amount;
    // we never trust it beyond capping by wallet balance and fee.
    // ---------------------------------------------------------------
    let requestedCredit = Number(body.credit_to_apply ?? 0);
    if (!Number.isFinite(requestedCredit) || requestedCredit < 0) requestedCredit = 0;
    requestedCredit = Math.min(requestedCredit, amount);

    let creditAmount = 0;
    if (requestedCredit > 0) {
      const { data: wallet } = await admin
        .from("resident_credit_wallets")
        .select("available_balance,allow_negative")
        .eq("user_id", userId)
        .maybeSingle();
      const available = Number(wallet?.available_balance ?? 0);
      const allowNeg = Boolean(wallet?.allow_negative);
      creditAmount = allowNeg
        ? requestedCredit
        : Math.min(requestedCredit, Math.max(0, available));
      // Round to 2 decimals (agorot)
      creditAmount = Math.round(creditAmount * 100) / 100;
    }
    const cardAmount = Math.round((amount - creditAmount) * 100) / 100;
    const fullyCoveredByCredit = cardAmount <= 0.001;

    // ---------------------------------------------------------------
    // Provider + environment. SINGLE source of truth, no fallback.
    // For full-credit payments we skip Cardcom entirely.
    // ---------------------------------------------------------------
    const environment = getPaymentEnvironment();

    let paymentProvider: SupportedProvider | "credit" = "cardcom";
    if (!fullyCoveredByCredit) {
      const { data: settings } = await admin
        .from("system_settings")
        .select("active_payment_provider")
        .limit(1)
        .maybeSingle();
      const configuredProvider = String(settings?.active_payment_provider ?? "");

      if (!SUPPORTED_PROVIDERS.includes(configuredProvider as SupportedProvider)) {
        console.error("[create-deposit] unsupported active_payment_provider", {
          configuredProvider,
        });
        return json(
          { error: "payment_provider_unsupported", provider: configuredProvider, message: BLOCKED_MESSAGE },
          503,
        );
      }
      paymentProvider = configuredProvider as SupportedProvider;

      if (!providerIsReady(paymentProvider, environment)) {
        console.error("[create-deposit] provider not credentialed", {
          paymentProvider,
          environment,
        });
        return json(
          { error: "payment_provider_unavailable", provider: paymentProvider, environment, message: BLOCKED_MESSAGE },
          503,
        );
      }
    } else {
      paymentProvider = "credit";
    }

    // ---------------------------------------------------------------
    // Deposit (payment intent). Reuse an open one for this user + deal,
    // but only within the SAME payment environment.
    // ---------------------------------------------------------------
    const { data: existingDeposit } = await admin
      .from("deposits")
      .select("id,status,amount,credit_amount,card_amount,provider_payment_url,payment_provider,payment_environment")
      .eq("user_id", userId)
      .eq("deal_id", deal.id)
      .eq("is_deleted", false)
      .in("status", ["pending", "awaiting_confirmation", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDeposit?.status === "paid") {
      return json(
        { error: "already_paid", message: "כבר הצטרפת לעסקה זו", deposit_id: existingDeposit.id },
        409,
      );
    }

    const reusable = existingDeposit &&
        existingDeposit.payment_environment === environment &&
        (existingDeposit.payment_provider === paymentProvider ||
          (fullyCoveredByCredit && existingDeposit.payment_provider === "credit"))
      ? existingDeposit
      : null;

    // Join details are stored on the deposit; the webhook materialises the
    // deal_interest only after the payment is confirmed.
    const joinPayload = sanitizeJoinPayload(body.join_payload);

    let depositId = reusable?.id ?? null;
    if (!depositId) {
      const { data: inserted, error: insErr } = await admin
        .from("deposits")
        .insert({
          user_id: userId,
          deal_id: deal.id,
          supplier_id: deal.supplier_id,
          amount,
          credit_amount: creditAmount,
          card_amount: cardAmount,
          gross_deposit_amount: amount,
          net_deposit_amount: amount,
          supplier_deduction_amount: 0,
          supplier_deduction_basis: "gross",
          payment_fee_absorber: "groupbuild",
          payment_processing_fee_status: "unknown",
          currency,
          payment_provider: paymentProvider,
          payment_environment: environment,
          status: "pending",
          payment_kind: "participation_fee",
          platform_fee_rule_id: ruleId,
          platform_fee_amount: amount,
          deal_price_snapshot: basePrice > 0 ? basePrice : null,
          metadata: {
            source: "create_deposit_participation_fee",
            deal_title: deal.title ?? null,
            participation_fee: amount,
            deal_price: basePrice > 0 ? basePrice : null,
            fee_rule_id: ruleId,
            fee_source: feeSource,
            credit_amount: creditAmount,
            card_amount: cardAmount,
            join_payload: joinPayload,
          },
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      depositId = inserted.id;
    } else {
      await admin
        .from("deposits")
        .update({
          amount,
          credit_amount: creditAmount,
          card_amount: cardAmount,
          platform_fee_amount: amount,
          platform_fee_rule_id: ruleId,
          deal_price_snapshot: basePrice > 0 ? basePrice : null,
          payment_provider: paymentProvider,
          metadata: {
            source: "create_deposit_participation_fee",
            deal_title: deal.title ?? null,
            participation_fee: amount,
            deal_price: basePrice > 0 ? basePrice : null,
            fee_rule_id: ruleId,
            fee_source: feeSource,
            credit_amount: creditAmount,
            card_amount: cardAmount,
            join_payload: joinPayload,
          },
        })
        .eq("id", depositId);
    }

    // Reserve credit atomically before charging the card / settling.
    // If reusing a deposit, release any prior reservation first so the
    // amount can be recalculated against the current wallet balance.
    if (reusable?.id && Number(reusable.credit_amount ?? 0) > 0) {
      await admin.rpc("release_credit_reservation", { _deposit_id: depositId });
    }
    if (creditAmount > 0) {
      const { data: reserveResult, error: reserveErr } = await admin.rpc(
        "reserve_credit_for_deposit",
        {
          _user_id: userId,
          _deal_id: deal.id,
          _deposit_id: depositId,
          _amount: creditAmount,
        },
      );
      if (reserveErr || !reserveResult || reserveResult.ok === false) {
        console.error("[create-deposit] credit reserve failed", reserveErr ?? reserveResult);
        return json({
          error: "credit_reserve_failed",
          message: "לא הצלחנו לשמור את הקרדיט. בדקו את היתרה ונסו שוב.",
        }, 409);
      }
      creditAmount = Number(reserveResult.credit_amount ?? creditAmount);
    }

    // Full credit → settle immediately, no Cardcom.
    if (fullyCoveredByCredit) {
      const { settleDepositPaid } = await import("../_shared/settleDeposit.ts");
      const { data: depRow } = await admin
        .from("deposits")
        .select("id,user_id,deal_id,status,metadata,payment_kind,amount,platform_fee_amount,payment_environment,credit_amount,card_amount")
        .eq("id", depositId!)
        .single();
      if (!depRow) {
        return json({ error: "deposit_missing", message: BLOCKED_MESSAGE }, 500);
      }
      await settleDepositPaid(admin, depRow, {
        provider: "credit" as SupportedProvider,
        environment,
        transactionId: `credit:${depositId}`,
        auditMetadata: { credit_amount: creditAmount, card_amount: 0 },
      });
      await admin.rpc("finalize_credit_for_deposit", { _deposit_id: depositId });
      const { sendJoinConfirmationEmail } = await import("../_shared/afterPayment.ts");
      await sendJoinConfirmationEmail(admin, depositId!);

      return json({
        ok: true,
        deposit_id: depositId,
        amount,
        credit_amount: creditAmount,
        card_amount: 0,
        deal_price: basePrice,
        participation_fee: amount,
        total_due: amount,
        fee_rule_id: ruleId,
        currency,
        payment_provider: "credit",
        payment_environment: environment,
        payment_url: null,
        paid_with_credit: true,
      });
    }

    let paymentUrl: string | null =
      typeof reusable?.provider_payment_url === "string"
        ? reusable.provider_payment_url
        : null;

    // For split payments, Cardcom must charge only the card portion.
    const chargeAmount = cardAmount;

    if (!paymentUrl && paymentProvider === "stripe") {
      paymentUrl = await createStripeCheckout({
        amount: chargeAmount,
        currency,
        dealId: deal.id,
        dealTitle: deal.title ?? "דמי שירות GroupBuild",
        depositId: depositId!,
        userId,
        userEmail: userData.user.email ?? undefined,
        environment,
      });
    } else if (!paymentUrl && paymentProvider === "cardcom") {
      paymentUrl = await createCardcomCheckout({
        amount: chargeAmount,
        dealId: deal.id,
        dealTitle: deal.title ?? "דמי שירות GroupBuild",
        depositId: depositId!,
        userEmail: userData.user.email ?? undefined,
        environment,
      });
    }

    if (!paymentUrl) {
      // Release reserved credit if checkout creation failed.
      if (creditAmount > 0) {
        await admin.rpc("release_credit_reservation", { _deposit_id: depositId });
      }
      console.error("[create-deposit] checkout creation failed", {
        provider: paymentProvider,
        environment,
      });
      return json({ error: "checkout_failed", message: BLOCKED_MESSAGE }, 503);
    }

    await admin
      .from("deposits")
      .update({
        provider_payment_url: paymentUrl,
        payment_provider: paymentProvider,
        payment_environment: environment,
        credit_amount: creditAmount,
        card_amount: cardAmount,
      })
      .eq("id", depositId!);

    console.log("[create-deposit] checkout ready", {
      deposit_id: depositId,
      provider: paymentProvider,
      environment,
      amount,
      credit_amount: creditAmount,
      card_amount: cardAmount,
    });

    return json({
      ok: true,
      deposit_id: depositId,
      amount,
      credit_amount: creditAmount,
      card_amount: cardAmount,
      deal_price: basePrice,
      participation_fee: amount,
      total_due: amount,
      fee_rule_id: ruleId,
      currency,
      payment_provider: paymentProvider,
      payment_environment: environment,
      payment_url: paymentUrl,
      paid_with_credit: false,
    });

  } catch (e) {
    console.error("[create-deposit] error", e);
    return json({ error: "internal_error", message: BLOCKED_MESSAGE }, 500);
  }
});

const JOIN_FIELDS = [
  "full_name",
  "phone",
  "city",
  "project_name",
  "notes",
  "estimated_quantity",
  "join_condition",
  "min_tier_locked",
  "terms_accepted_at",
] as const;

function sanitizeJoinPayload(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const key of JOIN_FIELDS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") {
      out[key] = v.slice(0, 500);
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

async function createStripeCheckout(opts: {
  amount: number;
  currency: string;
  dealId: string;
  dealTitle: string;
  depositId: string;
  userId: string;
  userEmail?: string;
  environment: PaymentEnvironment;
}): Promise<string | null> {
  const key = getStripeSecretKey(opts.environment);
  if (!key) return null;
  const origin = getSiteOrigin(opts.environment);
  const unitAmount = Math.round(opts.amount * 100); // ILS → agorot
  if (unitAmount <= 0) return null;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("expires_at", String(Math.floor(Date.now() / 1000) + 60 * 60)); // 60 min
  params.set(
    "success_url",
    `${origin}/payment/success?deal_id=${opts.dealId}&deposit_id=${opts.depositId}&env=${opts.environment}`,
  );
  params.set(
    "cancel_url",
    `${origin}/payment/cancel?deal_id=${opts.dealId}&deposit_id=${opts.depositId}&env=${opts.environment}`,
  );
  params.set("client_reference_id", opts.depositId);
  params.set("metadata[deposit_id]", opts.depositId);
  params.set("metadata[deal_id]", opts.dealId);
  params.set("metadata[user_id]", opts.userId);
  params.set("metadata[payment_environment]", opts.environment);

  if (opts.userEmail) params.set("customer_email", opts.userEmail);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (opts.currency || "ILS").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `דמי שירות עבור הצטרפות ורישום לעסקה: ${opts.dealTitle}`,
  );
  params.set(
    "line_items[0][price_data][product_data][description]",
    "דמי שירות עבור הצטרפות ורישום לעסקה לרכישת המוצר או השירות מהספק. המוצר או השירות מסופקים על ידי הספק מחוץ לאפליקציה.",
  );

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[create-deposit] stripe error", data);
      return null;
    }
    return typeof data.url === "string" ? data.url : null;
  } catch (e) {
    console.error("[create-deposit] stripe request failed", e);
    return null;
  }
}

async function createCardcomCheckout(opts: {
  amount: number;
  dealId: string;
  dealTitle: string;
  depositId: string;
  userEmail?: string;
  environment: PaymentEnvironment;
}): Promise<string | null> {
  const creds = getCardcomCredentials(opts.environment);
  if (!creds) return null;
  const origin = getSiteOrigin(opts.environment);
  const webhookSecret = getCardcomWebhookSecret();
  if (!webhookSecret) {
    console.error("[create-deposit] CARDCOM_WEBHOOK_SECRET missing — refusing to create checkout");
    return null;
  }
  const projectUrl = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl =
    `${projectUrl}/functions/v1/cardcom-webhook?secret=${encodeURIComponent(webhookSecret)}`;

  const query = `deal_id=${opts.dealId}&deposit_id=${opts.depositId}&env=${opts.environment}`;

  const buildPayload = (docType: string | null) => ({
    TerminalNumber: Number(creds.terminal),
    ApiName: creds.apiName,
    ApiPassword: creds.apiPassword,
    Operation: "ChargeOnly",
    Amount: opts.amount,
    CoinID: 1, // ILS
    MaxPayments: 1,
    Language: "he",
    // ReturnValue travels back on the webhook and is our deposit id.
    ReturnValue: opts.depositId,
    SuccessRedirectUrl: `${origin}/payment/success?${query}`,
    FailedRedirectUrl: `${origin}/payment/cancel?${query}`,
    WebHookUrl: webhookUrl,
    ProductName: `דמי שירות עבור הצטרפות ורישום לעסקה: ${opts.dealTitle}`,
    ISOCoinId: 1,
    // The terminal issues a document, so Cardcom requires a full Document
    // object with a document type + product lines.
    Document: docType
      ? {
        DocumentTypeToCreate: docType,
        Name: "לקוח GroupBuild",
        Email: opts.userEmail ?? undefined,
        IsSendByEmail: Boolean(opts.userEmail),
        Products: [
          {
            Description: `דמי שירות עבור הצטרפות לעסקה: ${opts.dealTitle}`,
            Quantity: 1,
            UnitCost: opts.amount,
            IsVatFree: false,
          },
        ],
      }
      : undefined,
  });

  const attempts: (string | null)[] = ["TaxInvoiceAndReceipt", "Order", null];

  try {
    for (const docType of attempts) {
      const res = await fetch(`${CARDCOM_API_BASE}/LowProfile/Create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(docType)),
      });
      const data = await res.json().catch(() => null) as Record<string, unknown> | null;
      if (res.ok && data && Number(data.ResponseCode ?? -1) === 0) {
        console.log("[create-deposit] cardcom checkout created", { docType });
        return typeof data.Url === "string" ? data.Url : null;
      }
      console.error("[create-deposit] cardcom create failed (v2)", {
        docType,
        http: res.status,
        code: data?.ResponseCode,
        description: data?.Description,
      });
    }
    return null;
  } catch (e) {
    console.error("[create-deposit] cardcom request failed", e);
    return null;
  }
}



function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
