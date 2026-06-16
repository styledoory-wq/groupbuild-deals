// Edge function: create-deposit
// Creates a pending deposit row and returns a Cardcom payment URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CARDCOM_API = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";

interface CreateDepositBody {
  deal_id?: string;
  user_id?: string;
  interest_id?: string;
  amount?: number;
  full_name?: string;
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ---------- Auth ----------
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

    // ---------- Body ----------
    const body = (await req.json().catch(() => ({}))) as CreateDepositBody;
    if (!body?.deal_id || typeof body.deal_id !== "string") {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר או לא תקין" }, 400);
    }

    // ---------- Env / Cardcom config ----------
    const terminal =
      Deno.env.get("CARDCOM_TERMINAL_NUMBER") ?? Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    const siteUrl =
      (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "") ||
      "https://groupbuild.co.il";

    if (!terminal || !apiName) {
      console.error("[create-deposit] missing Cardcom env vars", {
        hasTerminal: !!terminal,
        hasApiName: !!apiName,
        hasSiteUrl: !!Deno.env.get("SITE_URL"),
      });
      return json({
        error: "provider_not_configured",
        message: "הגדרות תשלום חסרות — פנה לאדמין",
      }, 503);
    }

    // ---------- Service-role client for trusted writes ----------
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: deal, error: dealErr }, { data: profile }] = await Promise.all([
      admin
        .from("deals")
        .select("id,title,deposit_required,deposit_amount,status,is_deleted,supplier_id")
        .eq("id", body.deal_id)
        .eq("is_deleted", false)
        .maybeSingle(),
      admin.from("profiles").select("full_name,phone,email").eq("id", userId).maybeSingle(),
    ]);

    if (dealErr) throw dealErr;
    if (!deal) {
      return json({ error: "deal_not_found", message: "העסקה לא נמצאה" }, 404);
    }
    if (deal.status !== "active") {
      return json({ error: "deal_not_active", message: "העסקה אינה פעילה" }, 409);
    }
    if (!deal.deposit_required || Number(deal.deposit_amount ?? 0) <= 0) {
      return json({ error: "deposit_not_required", message: "לעסקה זו לא נדרש פיקדון" }, 409);
    }

    const amount = Number(deal.deposit_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "invalid_amount", message: "סכום הפיקדון אינו תקין" }, 409);
    }

    // ---------- Already-paid / existing-pending ----------
    const { data: existingDeposit } = await admin
      .from("deposits")
      .select("id,status,provider_payment_url")
      .eq("user_id", userId)
      .eq("deal_id", body.deal_id)
      .eq("is_deleted", false)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDeposit?.status === "paid") {
      return json({
        error: "already_paid",
        message: "כבר הצטרפת לעסקה זו",
        deposit_id: existingDeposit.id,
      }, 409);
    }

    // ---------- Create or reuse pending deposit row ----------
    let depositId = existingDeposit?.id ?? null;
    if (!depositId) {
      const { data: inserted, error: insErr } = await supabase
        .from("deposits")
        .insert({
          user_id: userId,
          deal_id: body.deal_id,
          amount,
          gross_deposit_amount: amount,
          net_deposit_amount: amount,
          supplier_deduction_amount: amount,
          supplier_deduction_basis: "gross",
          payment_fee_absorber: "groupbuild",
          payment_processing_fee_status: "unknown",
          currency: "ILS",
          payment_provider: "cardcom",
          status: "pending",
          metadata: {
            source: "create_deposit_function",
            deal_title: deal.title ?? null,
            interest_id: body.interest_id ?? null,
          },
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      depositId = inserted.id;
    }

    // ---------- Call Cardcom ----------
    const fullName = body.full_name || profile?.full_name || "דייר GroupBuild";
    const email = body.email || profile?.email || userEmail || "";
    const phone = body.phone || profile?.phone || "";

    const successUrl = `${siteUrl}/payment/success?dep=${depositId}${
      body.interest_id ? `&interest_id=${encodeURIComponent(body.interest_id)}` : ""
    }`;
    const cancelUrl = `${siteUrl}/payment/cancel?dep=${depositId}${
      body.interest_id ? `&interest_id=${encodeURIComponent(body.interest_id)}` : ""
    }`;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")!.replace(/\/+$/, "")}/functions/v1/payment-webhook?provider=cardcom`;

    const cardcomPayload: Record<string, unknown> = {
      TerminalNumber: terminal,
      ApiName: apiName,
      Operation: "ChargeOnly",
      Amount: amount,
      CoinID: 1, // ILS
      ISOCoinId: 1,
      MaxPayments: 1,
      Language: "he",
      ProductName: "פיקדון השתתפות בעסקה קבוצתית",
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: cancelUrl,
      ReturnValue: depositId,
      WebHookUrl: webhookUrl,
      Customer: {
        FullName: fullName,
        Phone: phone,
        Email: email,
      },
    };
    if (apiPassword) cardcomPayload.ApiPassword = apiPassword;

    console.log("[create-deposit] calling Cardcom", {
      deposit_id: depositId,
      deal_id: body.deal_id,
      amount,
    });

    const cardcomRes = await fetch(CARDCOM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });

    const responseText = await cardcomRes.text();
    console.log("[create-deposit] Cardcom response", {
      status: cardcomRes.status,
      body: responseText.slice(0, 1000),
    });

    let responseJson: Record<string, unknown>;
    try {
      responseJson = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      await admin.from("deposits").update({ status: "failed" }).eq("id", depositId);
      return json({
        error: "cardcom_invalid_response",
        message: "שגיאה בחיבור לספק התשלום — פנה לתמיכה",
      }, 502);
    }

    const responseCode = Number(
      responseJson.ResponseCode ?? responseJson.responseCode ?? -1,
    );
    if (responseCode !== 0) {
      const description =
        (responseJson.Description as string) ??
        (responseJson.description as string) ??
        "שגיאה ביצירת עמוד תשלום";
      console.error("[create-deposit] Cardcom error", { responseCode, description });
      await admin
        .from("deposits")
        .update({ status: "failed", metadata: { cardcom_error: description } })
        .eq("id", depositId);
      return json({ error: "cardcom_error", message: description }, 502);
    }

    const paymentUrl =
      (responseJson.Url as string) ??
      (responseJson.url as string) ??
      (responseJson.LowProfileUrl as string) ??
      (responseJson.lowProfileUrl as string) ??
      null;

    const lowProfileId =
      (responseJson.LowProfileId as string) ??
      (responseJson.lowProfileId as string) ??
      null;

    const finalUrl =
      paymentUrl ||
      (lowProfileId
        ? `https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=${lowProfileId}`
        : null);

    if (!finalUrl) {
      console.error("[create-deposit] missing payment url", responseJson);
      return json({
        error: "cardcom_missing_url",
        message: "שגיאה בחיבור לספק התשלום — פנה לתמיכה",
      }, 502);
    }

    await admin
      .from("deposits")
      .update({
        provider_payment_url: finalUrl,
        provider_transaction_id: lowProfileId,
      })
      .eq("id", depositId);

    return json({
      ok: true,
      deposit_id: depositId,
      payment_url: finalUrl,
      provider: "cardcom",
    });
  } catch (e) {
    console.error("[create-deposit] error", e);
    return json({
      error: "internal_error",
      message: "אירעה שגיאה לא צפויה. נסו שוב מאוחר יותר.",
    }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
