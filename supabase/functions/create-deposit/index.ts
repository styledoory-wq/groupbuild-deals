// Edge function: create-deposit
// Creates a pending deposit row and returns a payment URL from the active provider.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getPaymentProvider,
  PaymentProviderError,
} from "../_shared/paymentProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateDepositBody {
  deal_id: string;
  offer_id?: string | null;
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "יש להתחבר כדי לשלם פיקדון" }, 401);
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
    const userEmail = userData.user.email ?? null;

    const body = (await req.json().catch(() => ({}))) as CreateDepositBody;
    if (!body?.deal_id || typeof body.deal_id !== "string") {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר או לא תקין" }, 400);
    }

    // Service-role client for trusted writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: settings }, { data: profile }] = await Promise.all([
      admin.from("system_settings").select("*").limit(1).maybeSingle(),
      admin.from("profiles").select("full_name,phone").eq("id", userId).maybeSingle(),
    ]);

    if (!settings?.active_payment_provider) {
      console.error("Missing system_settings.active_payment_provider");
      return json({
        error: "settings_missing",
        message: "הגדרות מערכת התשלומים חסרות. אנא פנו לתמיכה.",
      }, 409);
    }

    let paymentProvider;
    try {
      paymentProvider = getPaymentProvider(settings.active_payment_provider);
    } catch (providerErr) {
      const err = providerErr instanceof PaymentProviderError ? providerErr : null;
      return json({
        error: err?.code ?? "provider_invalid",
        message: "ספק הסליקה אינו מוגדר תקין. אנא פנו לתמיכה.",
      }, err?.status ?? 409);
    }
    const provider = paymentProvider.key;

    // Authorize through the caller's RLS-visible deal scope, then derive amount
    // exclusively from the deal. Client-supplied amounts are intentionally ignored.
    const { data: visibleDeal, error: dealErr } = await supabase
      .from("deals")
      .select("id,status,is_deleted,deposit_required,deposit_amount,title,supplier_id")
      .eq("id", body.deal_id)
      .eq("is_deleted", false)
      .eq("status", "active")
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!visibleDeal) {
      return json({
        error: "deal_not_found",
        message: "העסקה לא זמינה לתשלום פיקדון.",
      }, 404);
    }
    if (!visibleDeal.deposit_required || Number(visibleDeal.deposit_amount ?? 0) <= 0) {
      return json({
        error: "deposit_not_required",
        message: "לעסקה זו לא נדרש פיקדון.",
      }, 409);
    }

    const amount = Number(visibleDeal.deposit_amount);
    const amountInAgorot = Math.round(amount * 100);
    const hasAtMostTwoDecimals = Math.abs(amount * 100 - amountInAgorot) < 0.000001;
    if (!Number.isFinite(amount) || amount <= 0 || !hasAtMostTwoDecimals) {
      return json({
        error: "invalid_deposit_amount",
        message: "סכום הפיקדון בעסקה אינו תקין.",
      }, 409);
    }
    const minDepositAmount = settings.deposit_min_amount == null ? null : Number(settings.deposit_min_amount);
    const maxDepositAmount = settings.deposit_max_amount == null ? null : Number(settings.deposit_max_amount);
    if (minDepositAmount !== null && Number.isFinite(minDepositAmount) && amount < minDepositAmount) {
      return json({
        error: "deposit_amount_below_minimum",
        message: "סכום הפיקדון נמוך מהמינימום המוגדר במערכת.",
      }, 409);
    }
    if (maxDepositAmount !== null && Number.isFinite(maxDepositAmount) && amount > maxDepositAmount) {
      return json({
        error: "deposit_amount_above_maximum",
        message: "סכום הפיקדון גבוה מהמקסימום המוגדר במערכת.",
      }, 409);
    }
    const paymentFeeAbsorber = typeof settings.payment_fee_absorber === "string"
      ? settings.payment_fee_absorber
      : "groupbuild";
    const supplierDeductionBasis = paymentFeeAbsorber === "groupbuild" ? "gross" : "net";

    const { data: existingDeposit } = await admin
      .from("deposits")
      .select("id,status,provider_payment_url,payment_provider")
      .eq("user_id", userId)
      .eq("deal_id", body.deal_id)
      .eq("is_deleted", false)
      .in("status", ["pending", "paid"])
      .maybeSingle();
    if (existingDeposit?.status === "paid") {
      return json({
        error: "already_paid",
        message: "הפיקדון כבר שולם עבור העסקה הזו.",
        deposit_id: existingDeposit.id,
      }, 409);
    }
    if (existingDeposit?.status === "pending" && existingDeposit.provider_payment_url) {
      return json({
        ok: true,
        deposit_id: existingDeposit.id,
        payment_url: existingDeposit.provider_payment_url,
        provider: existingDeposit.payment_provider,
        provider_response: null,
      });
    }
    if (existingDeposit?.status === "pending" && existingDeposit.payment_provider !== provider) {
      return json({
        error: "existing_deposit_provider_mismatch",
        message: "קיים פיקדון פתוח עם ספק תשלום אחר. אנא פנו לתמיכה.",
      }, 409);
    }

    // Pre-check provider readiness BEFORE creating any deposit row.
    const missingSecrets = paymentProvider.getMissingSecrets();
    if (missingSecrets.length > 0) {
      console.warn(
        `Payment attempt blocked: provider=${provider} missing secrets=${missingSecrets.join(",")} user=${userId} deal=${body.deal_id}`,
      );
      await admin.from("deposit_attempt_logs").insert({
        user_id: userId,
        deal_id: body.deal_id,
        attempted_amount: amount,
        reason: "provider_not_configured",
        metadata: {
          provider,
          missing_secrets: missingSecrets,
          attempted_at: new Date().toISOString(),
        },
      });
      return json({
        error: "provider_not_configured",
        message: "מערכת התשלומים עדיין לא הופעלה. אנא נסו מאוחר יותר.",
        provider,
      }, 200);
      // Note: returning 200 so the client can show the friendly toast without
      // supabase-js wrapping it as a generic non-2xx error.
    }
    if (!paymentProvider.implemented) {
      await admin.from("deposit_attempt_logs").insert({
        user_id: userId,
        deal_id: body.deal_id,
        attempted_amount: amount,
        reason: "provider_not_implemented",
        metadata: {
          provider,
          attempted_at: new Date().toISOString(),
        },
      });
      return json({
        error: "provider_not_implemented",
        message: "ספק התשלום עדיין לא חובר בפועל. אנא פנו לתמיכה.",
        provider,
      }, 200);
    }

    // 1. Reuse an existing pending deposit when present; otherwise create one.
    let deposit = existingDeposit;
    if (!deposit) {
      const { data: insertedDeposit, error: insErr } = await supabase
        .from("deposits")
        .insert({
          user_id: userId,
          deal_id: body.deal_id,
          amount,
          gross_deposit_amount: amount,
          payment_processing_fee_amount: null,
          payment_processing_fee_status: "unknown",
          net_deposit_amount: amount,
          payment_fee_absorber: paymentFeeAbsorber,
          supplier_deduction_basis: supplierDeductionBasis,
          supplier_deduction_amount: amount,
          currency: "ILS",
          payment_provider: provider,
          status: "pending",
          metadata: {
            source: "create_deposit_function",
            deal_title: visibleDeal.title ?? null,
          },
        })
        .select()
        .single();
      if (insErr) throw insErr;
      deposit = insertedDeposit;
    }

    // 2. Ask provider for a payment URL
    let providerRes;
    try {
      providerRes = await paymentProvider.createCheckoutSession({
        depositId: deposit.id,
        dealId: body.deal_id,
        offerId: typeof body.offer_id === "string" ? body.offer_id : null,
        residentId: userId,
        supplierId: visibleDeal.supplier_id,
        amount,
        currency: "ILS",
        paymentFeeAbsorber,
        userEmail,
        userName: profile?.full_name ?? null,
        userPhone: profile?.phone ?? null,
        dealTitle: visibleDeal.title ?? null,
        description: visibleDeal.title ?? null,
      });
    } catch (provErr) {
      const isProvErr = provErr instanceof PaymentProviderError;
      const reason = isProvErr
        ? provErr.code
        : provErr instanceof Error
          ? provErr.message
          : String(provErr);
      const message = isProvErr
        ? provErr.message
        : "שגיאה ביצירת תשלום מול ספק הסליקה. נסו שוב מאוחר יותר.";
      await admin
        .from("deposits")
        .update({ status: "failed", metadata: { reason } })
        .eq("id", deposit.id);
      return json({
        error: isProvErr ? provErr.code : "provider_error",
        message,
        provider,
      }, 200);
    }

    // 3. Save provider info on the deposit
    const providerUpdate: Record<string, unknown> = {
      provider_payment_url: providerRes.payment_url,
    };
    if (providerRes.provider_transaction_id) {
      providerUpdate.provider_transaction_id = providerRes.provider_transaction_id;
    }
    await admin
      .from("deposits")
      .update(providerUpdate)
      .eq("id", deposit.id);

    return json({
      ok: true,
      deposit_id: deposit.id,
      payment_url: providerRes.payment_url,
      provider,
      provider_response: providerRes.raw_response ?? null,
    });
  } catch (e) {
    console.error("create-deposit error", e);
    return json({
      error: "internal_error",
      message: "אירעה שגיאה לא צפויה. נסו שוב מאוחר יותר.",
    }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
