import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getDealPriceForFee,
  matchPlatformFeeRule,
  type PlatformFeeRule,
} from "../_shared/platformFees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDepositBody {
  deal_id?: string;
  interest_id?: string;
  participant_count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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
    if (!body?.deal_id) {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select(
        "id,title,status,is_deleted,supplier_id,category_id,listing_type,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,deposit_required,deposit_amount",
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

    // Participant count for tiered pricing (best-effort)
    let participants = Number(body.participant_count ?? 0);
    if (!Number.isFinite(participants) || participants < 0) participants = 0;
    if (!participants) {
      const { data: paidCount } = await admin.rpc("get_deal_paid_count", { _deal_id: deal.id });
      if (typeof paidCount === "number") participants = paidCount;
    }

    const dealPrice = getDealPriceForFee(
      {
        offer_type: deal.offer_type,
        original_price: deal.original_price,
        discounted_price: deal.discounted_price,
        discount_percentage: deal.discount_percentage,
        base_price: deal.base_price,
        tiers: Array.isArray(deal.tiers) ? deal.tiers : [],
      },
      participants,
    );

    // Prefer RPC; fall back to table read + matcher
    let feeAmount = 0;
    let ruleId: string | null = null;
    let ruleName: string | null = null;
    let currency = "ILS";

    const { data: rpcRows, error: rpcErr } = await admin.rpc("resolve_platform_fee", {
      _deal_price: dealPrice,
      _fee_type: "participation",
      _category_id: deal.category_id ?? null,
      _offer_type: deal.offer_type ?? null,
      _listing_type: listingType,
    });
    if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
      feeAmount = Number(rpcRows[0].fee_amount ?? 0);
      ruleId = rpcRows[0].rule_id ?? null;
      ruleName = rpcRows[0].name ?? null;
      currency = rpcRows[0].currency ?? "ILS";
    } else {
      const { data: rules } = await admin
        .from("platform_fees")
        .select(
          "id,name,fee_type,min_deal_price,max_deal_price,fee_amount,currency,is_active,category_id,offer_type,listing_type,priority,sort_order",
        )
        .eq("is_active", true)
        .eq("fee_type", "participation");
      const matched = matchPlatformFeeRule((rules ?? []) as PlatformFeeRule[], {
        dealPrice,
        categoryId: deal.category_id,
        offerType: deal.offer_type,
        listingType,
      });
      if (matched) {
        feeAmount = Number(matched.fee_amount);
        ruleId = matched.id;
        ruleName = matched.name;
        currency = matched.currency ?? "ILS";
      }
    }

    if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
      return json(
        { error: "fee_not_configured", message: "לא הוגדרו דמי השתתפות למחיר עסקה זה" },
        409,
      );
    }

    const amount = feeAmount;

    const { data: existingDeposit } = await admin
      .from("deposits")
      .select("id,status,amount,provider_payment_url,payment_provider")
      .eq("user_id", userId)
      .eq("deal_id", body.deal_id)
      .eq("is_deleted", false)
      .in("status", ["pending", "awaiting_confirmation", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDeposit?.status === "paid") {
      return json(
        {
          error: "already_paid",
          message: "כבר הצטרפת לעסקה זו",
          deposit_id: existingDeposit.id,
        },
        409,
      );
    }

    // Active payment provider (stripe preferred when configured)
    const { data: settings } = await admin
      .from("system_settings")
      .select("active_payment_provider")
      .limit(1)
      .maybeSingle();
    const configuredProvider = (settings?.active_payment_provider ?? "manual") as string;
    let paymentProvider = "manual";
    if (configuredProvider === "stripe" && Deno.env.get("STRIPE_SECRET_KEY")) {
      paymentProvider = "stripe";
    } else if (configuredProvider === "cardcom" && Deno.env.get("CARDCOM_TERMINAL")) {
      paymentProvider = "cardcom";
    } else if (Deno.env.get("STRIPE_SECRET_KEY")) {
      paymentProvider = "stripe";
    } else if (Deno.env.get("CARDCOM_TERMINAL")) {
      paymentProvider = "cardcom";
    }

    let depositId = existingDeposit?.id ?? null;
    if (!depositId) {
      const { data: inserted, error: insErr } = await admin
        .from("deposits")
        .insert({
          user_id: userId,
          deal_id: body.deal_id,
          supplier_id: deal.supplier_id,
          amount,
          gross_deposit_amount: amount,
          net_deposit_amount: amount,
          supplier_deduction_amount: 0,
          supplier_deduction_basis: "gross",
          payment_fee_absorber: "groupbuild",
          payment_processing_fee_status: "unknown",
          currency,
          payment_provider: paymentProvider,
          status: "pending",
          payment_kind: "participation_fee",
          platform_fee_rule_id: ruleId,
          platform_fee_amount: amount,
          deal_price_snapshot: dealPrice,
          metadata: {
            source: "create_deposit_participation_fee",
            deal_title: deal.title ?? null,
            interest_id: body.interest_id ?? null,
            participation_fee: amount,
            deal_price: dealPrice,
            fee_rule_id: ruleId,
            fee_rule_name: ruleName,
            total_charged_amount: amount,
          },
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      depositId = inserted.id;
    }

    // Try to create a hosted checkout URL for Stripe / Cardcom
    let paymentUrl: string | null =
      typeof existingDeposit?.provider_payment_url === "string"
        ? existingDeposit.provider_payment_url
        : null;

    if (!paymentUrl && paymentProvider === "stripe") {
      paymentUrl = await createStripeCheckout({
        amount,
        currency,
        dealId: deal.id,
        dealTitle: deal.title ?? "דמי השתתפות GroupBuild",
        depositId: depositId!,
        userId,
        userEmail: userData.user.email ?? undefined,
      });
    } else if (!paymentUrl && paymentProvider === "cardcom") {
      paymentUrl = await createCardcomCheckout({
        amount,
        dealId: deal.id,
        dealTitle: deal.title ?? "דמי השתתפות GroupBuild",
      });
    }

    if (paymentUrl && depositId) {
      await admin
        .from("deposits")
        .update({
          provider_payment_url: paymentUrl,
          payment_provider: paymentProvider,
        })
        .eq("id", depositId);
    }

    return json({
      ok: true,
      deposit_id: depositId,
      amount,
      deal_price: dealPrice,
      participation_fee: amount,
      total_due: amount,
      fee_rule_id: ruleId,
      fee_rule_name: ruleName,
      currency,
      payment_provider: paymentProvider,
      payment_url: paymentUrl,
      // Kept for backward-compatible UI that still reads supplier_payment_info
      supplier_payment_info: null,
    });
  } catch (e) {
    console.error("[create-deposit] error", e);
    return json({ error: "internal_error", message: "אירעה שגיאה לא צפויה" }, 500);
  }
});

async function createStripeCheckout(opts: {
  amount: number;
  currency: string;
  dealId: string;
  dealTitle: string;
  depositId: string;
  userId: string;
  userEmail?: string;
}): Promise<string | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  const origin = Deno.env.get("PUBLIC_SITE_URL") ?? "https://groupbuild.co.il";
  const unitAmount = Math.round(opts.amount * 100); // ILS → agorot
  if (unitAmount <= 0) return null;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/payment/success?deal_id=${opts.dealId}&deposit_id=${opts.depositId}`);
  params.set("cancel_url", `${origin}/payment/cancel?deal_id=${opts.dealId}&deposit_id=${opts.depositId}`);
  params.set("client_reference_id", opts.depositId);
  params.set("metadata[deposit_id]", opts.depositId);
  params.set("metadata[deal_id]", opts.dealId);
  params.set("metadata[user_id]", opts.userId);
  params.set("metadata[payment_kind]", "participation_fee");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (opts.currency || "ILS").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.set("line_items[0][price_data][product_data][name]", `דמי השתתפות · ${opts.dealTitle}`);
  if (opts.userEmail) params.set("customer_email", opts.userEmail);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[create-deposit] stripe error", data);
    return null;
  }
  return typeof data.url === "string" ? data.url : null;
}

async function createCardcomCheckout(opts: {
  amount: number;
  dealId: string;
  dealTitle: string;
}): Promise<string | null> {
  const terminal = Deno.env.get("CARDCOM_TERMINAL");
  const apiName = Deno.env.get("CARDCOM_API_NAME");
  const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
  if (!terminal || !apiName || !apiPassword) return null;

  const origin = Deno.env.get("PUBLIC_SITE_URL") ?? "https://groupbuild.co.il";
  const cardcomRes = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TerminalNumber: terminal,
      ApiName: apiName,
      ApiPassword: apiPassword,
      Amount: opts.amount,
      CoinID: 1,
      MaxPayments: 1,
      Language: "he",
      SuccessRedirectUrl: `${origin}/payment/success?deal_id=${opts.dealId}`,
      FailedRedirectUrl: `${origin}/payment/cancel?deal_id=${opts.dealId}`,
      ProductName: `דמי השתתפות · ${opts.dealTitle}`,
    }),
  });
  const responseJson = await cardcomRes.json().catch(() => ({}));
  const responseCode = Number(responseJson.ResponseCode ?? responseJson.responseCode ?? -1);
  if (responseCode !== 0) {
    console.error("[create-deposit] cardcom error", responseJson);
    return null;
  }
  return (
    (responseJson.url as string) ??
    (responseJson.Url as string) ??
    (responseJson.LowProfileUrl as string) ??
    null
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
