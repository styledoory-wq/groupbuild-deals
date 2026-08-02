import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CARDCOM_API = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";
const SUCCESS_URL = "https://groupbuild.co.il/payment/success";
const FAILURE_URL = "https://groupbuild.co.il/payment/cancel";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "יש להתחבר כדי ליצור תשלום" }, 401);
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

    // Parse body
    const body = (await req.json().catch(() => ({}))) as { deal_id?: string; user_id?: string };
    if (!body?.deal_id || typeof body.deal_id !== "string") {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר" }, 400);
    }

    // Fetch deal via service-role to get deposit_amount
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, title, deposit_required, deposit_amount, status, is_deleted")
      .eq("id", body.deal_id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (dealErr) throw dealErr;
    if (!deal) {
      return json({ error: "deal_not_found", message: "העסקה לא נמצאה" }, 404);
    }
    // Prefer participation fee from platform_fees via RPC; fall back to legacy deposit_amount
    let amount = 0;
    const { data: feeRows } = await admin.rpc("resolve_platform_fee", {
      _deal_price: Number(deal.deposit_amount ?? 0),
      _fee_type: "participation",
    });
    if (Array.isArray(feeRows) && feeRows.length > 0) {
      amount = Number(feeRows[0].fee_amount ?? 0);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      if (!deal.deposit_required || Number(deal.deposit_amount ?? 0) <= 0) {
        return json({ error: "fee_not_required", message: "לעסקה זו לא נדרשים דמי השתתפות" }, 409);
      }
      amount = Number(deal.deposit_amount);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "invalid_amount", message: "סכום דמי ההשתתפות אינו תקין" }, 409);
    }

    // Cardcom credentials from env
    const terminal = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");

    if (!terminal || !apiName || !apiPassword) {
      console.error("[create-cardcom-payment] missing env vars");
      return json({ error: "provider_not_configured", message: "מערכת התשלומים לא הוגדרה" }, 503);
    }

    // Call Cardcom API
    const cardcomPayload = {
      TerminalNumber: terminal,
      ApiName: apiName,
      ApiPassword: apiPassword,
      Amount: amount,
      CoinID: 1,          // 1 = ILS
      MaxPayments: 1,
      Language: "he",
      SuccessRedirectUrl: `${SUCCESS_URL}?deal_id=${body.deal_id}`,
      FailedRedirectUrl: `${FAILURE_URL}?deal_id=${body.deal_id}`,
      ProductName: deal.title ? `דמי השתתפות · ${deal.title}` : "דמי השתתפות GroupBuild",
    };

    console.log("[create-cardcom-payment] calling Cardcom", {
      terminal,
      amount,
      deal_id: body.deal_id,
    });

    const cardcomRes = await fetch(CARDCOM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });

    const responseText = await cardcomRes.text();
    console.log("[create-cardcom-payment] Cardcom response", {
      status: cardcomRes.status,
      body: responseText,
    });

    let responseJson: Record<string, unknown>;
    try {
      responseJson = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      return json({ error: "cardcom_invalid_response", message: "תגובה לא תקינה מ-Cardcom" }, 502);
    }

    // ResponseCode 0 = success in Cardcom
    const responseCode = Number(responseJson.ResponseCode ?? responseJson.responseCode ?? -1);
    if (responseCode !== 0) {
      const description =
        (responseJson.Description as string) ??
        (responseJson.description as string) ??
        "שגיאה ביצירת עמוד תשלום";
      console.error("[create-cardcom-payment] Cardcom error", { responseCode, description });
      return json({ error: "cardcom_error", message: description }, 502);
    }

    const paymentUrl =
      (responseJson.url as string) ??
      (responseJson.Url as string) ??
      (responseJson.LowProfileUrl as string);

    if (!paymentUrl) {
      return json({ error: "cardcom_missing_url", message: "Cardcom לא החזיר כתובת תשלום" }, 502);
    }

    return json({
      ok: true,
      payment_url: paymentUrl,
      provider: "cardcom",
      low_profile_id: (responseJson.LowProfileId as string) ?? null,
    });
  } catch (e) {
    console.error("[create-cardcom-payment] error", e);
    return json({ error: "internal_error", message: "שגיאה לא צפויה. נסו שוב." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
