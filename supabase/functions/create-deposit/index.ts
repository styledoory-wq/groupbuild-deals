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
async function createGrowPayment(args: {
  depositId: string;
  amount: number;
  userEmail: string | null;
  userName: string | null;
  dealId: string;
}): Promise<ProviderResult> {
  // TODO: Replace with real Grow (MeshulamPay) API call once credentials arrive.
  // Required secrets to configure in Lovable Cloud:
  //   - GROW_API_KEY
  //   - GROW_PAGE_CODE
  //   - GROW_USER_ID
  // Docs: https://grow.meshulam.co.il/api-docs (createPaymentProcess endpoint)
  //
  // Example real implementation (uncomment & fill once keys are provided):
  //
  // const apiKey   = Deno.env.get("GROW_API_KEY");
  // const pageCode = Deno.env.get("GROW_PAGE_CODE");
  // const userId   = Deno.env.get("GROW_USER_ID");
  // if (!apiKey || !pageCode || !userId) throw new Error("Grow credentials missing");
  //
  // const res = await fetch("https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess/", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     userId, pageCode, apiKey,
  //     sum: args.amount,
  //     paymentType: "regular",
  //     description: `פיקדון לעסקה ${args.dealId}`,
  //     pageField: { contact: args.userName ?? "", email: args.userEmail ?? "" },
  //     successUrl: `${Deno.env.get("APP_URL")}/payment/success?dep=${args.depositId}`,
  //     cancelUrl:  `${Deno.env.get("APP_URL")}/payment/cancel?dep=${args.depositId}`,
  //     notifyUrl:  `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=grow`,
  //     chargeIdentifier: args.depositId,
  //   }),
  // });
  // const data = await res.json();
  // if (data.status !== 1) throw new Error(`Grow error: ${JSON.stringify(data)}`);
  // return {
  //   payment_url: data.data.url,
  //   provider_transaction_id: data.data.processId,
  // };

  throw new Error(
    "Grow payment provider is not yet configured. Add GROW_API_KEY, GROW_PAGE_CODE and GROW_USER_ID secrets in Lovable Cloud and uncomment the implementation in supabase/functions/create-deposit/index.ts."
  );
}

async function createCardcomPayment(args: {
  depositId: string;
  amount: number;
  userEmail: string | null;
  userName: string | null;
  dealId: string;
}): Promise<ProviderResult> {
  // TODO: Replace with real Cardcom LowProfile API call.
  // Required secrets:
  //   - CARDCOM_TERMINAL_NUMBER
  //   - CARDCOM_API_NAME
  // Docs: https://developer.cardcom.solutions/reference/lowprofilecreate
  //
  // Example real implementation (uncomment & fill once keys are provided):
  //
  // const terminal = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
  // const apiName  = Deno.env.get("CARDCOM_API_NAME");
  // if (!terminal || !apiName) throw new Error("Cardcom credentials missing");
  //
  // const res = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     TerminalNumber: Number(terminal),
  //     ApiName: apiName,
  //     Amount: args.amount,
  //     ISOCoinId: 1, // ILS
  //     ReturnValue: args.depositId,
  //     SuccessRedirectUrl: `${Deno.env.get("APP_URL")}/payment/success?dep=${args.depositId}`,
  //     FailedRedirectUrl:  `${Deno.env.get("APP_URL")}/payment/cancel?dep=${args.depositId}`,
  //     WebHookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=cardcom`,
  //     Operation: "ChargeOnly",
  //     UIDefinition: { IsHideCardOwnerName: false },
  //     Document: { Name: args.userName ?? "", Email: args.userEmail ?? "" },
  //   }),
  // });
  // const data = await res.json();
  // if (data.ResponseCode !== 0) throw new Error(`Cardcom error: ${data.Description}`);
  // return {
  //   payment_url: data.Url,
  //   provider_transaction_id: String(data.LowProfileId),
  // };

  throw new Error(
    "Cardcom payment provider is not yet configured. Add CARDCOM_TERMINAL_NUMBER and CARDCOM_API_NAME secrets in Lovable Cloud and uncomment the implementation in supabase/functions/create-deposit/index.ts."
  );
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? null;

    const body = (await req.json()) as CreateDepositBody;
    if (!body?.deal_id || typeof body.deal_id !== "string") {
      return json({ error: "deal_id is required" }, 400);
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

    const provider = (settings?.active_payment_provider ?? "grow") as
      | "grow"
      | "cardcom";
    const amount = body.amount ?? Number(settings?.deposit_default_amount ?? 1000);

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
      // Mark deposit as failed so we don't leave dangling pending rows
      await admin
        .from("deposits")
        .update({ status: "failed", metadata: { error: String(provErr) } })
        .eq("id", deposit.id);
      return json(
        {
          error: "payment_provider_unavailable",
          message: provErr instanceof Error ? provErr.message : String(provErr),
          provider,
        },
        503,
      );
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
      deposit_id: deposit.id,
      payment_url: providerRes.payment_url,
      provider,
    });
  } catch (e) {
    console.error("create-deposit error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
