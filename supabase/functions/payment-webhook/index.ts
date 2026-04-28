// Edge function: payment-webhook
// Receives async payment notifications from Grow / Cardcom and updates deposits.
// Public endpoint — no JWT required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

type DepositStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

interface ParsedWebhook {
  depositId: string | null;
  providerTxnId: string | null;
  status: DepositStatus;
  raw: unknown;
}

// ---------------------------------------------------------------
// Provider parsers
// ---------------------------------------------------------------
function parseGrowWebhook(payload: Record<string, unknown>): ParsedWebhook {
  // TODO: Verify Grow signature once credentials arrive.
  // Grow typically posts: { status, data: { transactionId, chargeIdentifier, statusCode, ... } }
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const statusCode = Number(data.statusCode ?? payload.status ?? 0);
  const status: DepositStatus =
    statusCode === 1 ? "paid" : statusCode === 0 ? "pending" : "failed";

  return {
    depositId: (data.chargeIdentifier as string) ?? null,
    providerTxnId: (data.transactionId as string) ?? null,
    status,
    raw: payload,
  };
}

function parseCardcomWebhook(payload: Record<string, unknown>): ParsedWebhook {
  // TODO: Verify Cardcom signature once credentials arrive.
  // Cardcom posts: { ResponseCode, ReturnValue, LowProfileId, TranzactionId, ... }
  const responseCode = Number(payload.ResponseCode ?? -1);
  const status: DepositStatus = responseCode === 0 ? "paid" : "failed";

  return {
    depositId: (payload.ReturnValue as string) ?? null,
    providerTxnId:
      (payload.TranzactionId as string) ??
      (payload.LowProfileId as string) ??
      null,
    status,
    raw: payload,
  };
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const provider = (url.searchParams.get("provider") ?? "grow") as
      | "grow"
      | "cardcom";

    let payload: Record<string, unknown> = {};
    const ctype = req.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = String(v)));
    }

    const parsed =
      provider === "cardcom"
        ? parseCardcomWebhook(payload)
        : parseGrowWebhook(payload);

    if (!parsed.depositId) {
      console.warn("Webhook missing depositId", { provider, payload });
      return json({ ok: false, error: "missing_deposit_id" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const update: Record<string, unknown> = {
      status: parsed.status,
      provider_transaction_id: parsed.providerTxnId,
      metadata: parsed.raw,
    };
    if (parsed.status === "paid") update.paid_at = new Date().toISOString();
    if (parsed.status === "refunded")
      update.refunded_at = new Date().toISOString();

    const { error } = await admin
      .from("deposits")
      .update(update)
      .eq("id", parsed.depositId);
    if (error) throw error;

    return json({ ok: true });
  } catch (e) {
    console.error("payment-webhook error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
