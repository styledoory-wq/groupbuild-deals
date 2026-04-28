// Edge function: create-deposit
// Creates a pending deposit row and returns a payment URL from the active provider.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateDepositBody {
  deal_id: string;
  amount?: number;
}

interface ProviderResult {
  payment_url: string;
  provider_transaction_id: string;
}

// ---------------------------------------------------------------
// Provider Adapters
// ---------------------------------------------------------------
function providerSecretsStatus(provider: "grow" | "cardcom"): { ok: boolean; missing: string[] } {
  if (provider === "grow") {
    const required = ["GROW_API_KEY", "GROW_PAGE_CODE", "GROW_USER_ID"];
    const missing = required.filter((k) => !Deno.env.get(k));
    return { ok: missing.length === 0, missing };
  }
  const required = ["CARDCOM_TERMINAL_NUMBER", "CARDCOM_API_NAME"];
  const missing = required.filter((k) => !Deno.env.get(k));
  return { ok: missing.length === 0, missing };
}

async function createGrowPayment(_args: {
  depositId: string;
  amount: number;
  userEmail: string | null;
  userName: string | null;
  dealId: string;
}): Promise<ProviderResult> {
  // TODO: Replace with real Grow (MeshulamPay) API call once credentials arrive.
  // Required secrets: GROW_API_KEY, GROW_PAGE_CODE, GROW_USER_ID
  // Docs: https://grow.meshulam.co.il/api-docs (createPaymentProcess endpoint)
  //
  // const apiKey   = Deno.env.get("GROW_API_KEY")!;
  // const pageCode = Deno.env.get("GROW_PAGE_CODE")!;
  // const userId   = Deno.env.get("GROW_USER_ID")!;
  // const res = await fetch("https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess/", { ... });
  // return { payment_url: data.data.url, provider_transaction_id: data.data.processId };
  throw new Error("grow_not_implemented");
}

async function createCardcomPayment(_args: {
  depositId: string;
  amount: number;
  userEmail: string | null;
  userName: string | null;
  dealId: string;
}): Promise<ProviderResult> {
  // TODO: Replace with real Cardcom LowProfile API call once credentials arrive.
  // Required secrets: CARDCOM_TERMINAL_NUMBER, CARDCOM_API_NAME
  throw new Error("cardcom_not_implemented");
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
      admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);

    if (!settings?.active_payment_provider || !settings?.deposit_default_amount) {
      console.error("Missing system_settings (active_payment_provider / deposit_default_amount)");
      return json({
        error: "settings_missing",
        message: "הגדרות מערכת התשלומים חסרות. אנא פנו לתמיכה.",
      }, 409);
    }

    const provider = settings.active_payment_provider as "grow" | "cardcom";
    const amount = body.amount ?? Number(settings.deposit_default_amount);

    // Pre-check provider secrets BEFORE creating any deposit row
    const secretsCheck = providerSecretsStatus(provider);
    if (!secretsCheck.ok) {
      console.warn(
        `Payment attempt blocked: provider=${provider} missing secrets=${secretsCheck.missing.join(",")} user=${userId} deal=${body.deal_id}`,
      );
      // Log failed attempt for admin visibility (no real deposit created)
      await admin.from("deposits").insert({
        user_id: userId,
        deal_id: body.deal_id,
        amount,
        currency: "ILS",
        payment_provider: provider,
        status: "failed",
        metadata: {
          reason: "provider_not_configured",
          missing_secrets: secretsCheck.missing,
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

    // 1. Insert pending deposit
    const { data: deposit, error: insErr } = await admin
      .from("deposits")
      .insert({
        user_id: userId,
        deal_id: body.deal_id,
        amount,
        currency: "ILS",
        payment_provider: provider,
        status: "pending",
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // 2. Ask provider for a payment URL
    let providerRes: ProviderResult;
    try {
      providerRes =
        provider === "cardcom"
          ? await createCardcomPayment({
              depositId: deposit.id,
              amount,
              userEmail,
              userName: profile?.full_name ?? null,
              dealId: body.deal_id,
            })
          : await createGrowPayment({
              depositId: deposit.id,
              amount,
              userEmail,
              userName: profile?.full_name ?? null,
              dealId: body.deal_id,
            });
    } catch (provErr) {
      const reason = provErr instanceof Error ? provErr.message : String(provErr);
      await admin
        .from("deposits")
        .update({ status: "failed", metadata: { reason } })
        .eq("id", deposit.id);
      return json({
        error: "provider_error",
        message: "שגיאה ביצירת תשלום מול ספק הסליקה. נסו שוב מאוחר יותר.",
        provider,
      }, 200);
    }

    // 3. Save provider info on the deposit
    await admin
      .from("deposits")
      .update({
        provider_payment_url: providerRes.payment_url,
        provider_transaction_id: providerRes.provider_transaction_id,
      })
      .eq("id", deposit.id);

    return json({
      ok: true,
      deposit_id: deposit.id,
      payment_url: providerRes.payment_url,
      provider,
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
