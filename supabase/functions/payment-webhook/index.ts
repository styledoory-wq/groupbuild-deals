// Edge function: payment-webhook
// Receives async payment notifications from the active external provider and updates deposits.
// Public endpoint: provider authentication is handled by the selected payment adapter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getPaymentProvider,
  PaymentProviderError,
} from "../_shared/paymentProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret, x-make-callback-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const providerParam = url.searchParams.get("provider") ?? "grow";
    let paymentProvider;
    try {
      paymentProvider = getPaymentProvider(providerParam);
    } catch (providerErr) {
      const err = providerErr instanceof PaymentProviderError ? providerErr : null;
      return json({ ok: false, error: err?.code ?? "invalid_provider" }, err?.status ?? 400);
    }
    const provider = paymentProvider.key;

    const reqForForm = req.clone();
    const rawBody = await req.text();
    const signatureOk = await paymentProvider.verifyWebhookSignature({ req, url, rawBody });
    if (!signatureOk) {
      console.warn("Rejected payment webhook: invalid signature/secret", { provider });
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const payload = await parseRequestBody(reqForForm, rawBody);
    if (!payload) {
      return json({ ok: false, error: "invalid_payload" }, 400);
    }

    const parsed = paymentProvider.parseWebhookEvent(payload);
    if (!parsed.depositId) {
      console.warn("Webhook missing depositId", { provider, payload });
      return json({ ok: false, error: "missing_deposit_id" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Async URL delivery: Make may post just { deposit_id, payment_url } after
    // creating the Grow link. Detect that and store the URL without requiring
    // a full status payload.
    const inlineUrl =
      stringOrNull((payload as Record<string, unknown>).payment_url) ??
      stringOrNull((payload as Record<string, unknown>).paymentUrl) ??
      stringOrNull(((payload as Record<string, unknown>).data as Record<string, unknown> | undefined)?.payment_url);
    if (inlineUrl && (parsed.providerStatus === null || parsed.depositStatus === "pending")) {
      const { error: urlErr } = await admin
        .from("deposits")
        .update({ provider_payment_url: inlineUrl })
        .eq("id", parsed.depositId);
      if (urlErr) throw urlErr;
      console.log("[payment_webhook_url_stored]", { deposit_id: parsed.depositId, url: inlineUrl });
      return json({ ok: true, url_stored: true });
    }

    const { data: deposit, error: depErr } = await admin
      .from("deposits")
      .select("id,status,payment_provider,provider_transaction_id,is_deleted,supplier_deduction_basis,gross_deposit_amount")
      .eq("id", parsed.depositId)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!deposit || deposit.is_deleted) {
      return json({ ok: false, error: "deposit_not_found" }, 404);
    }
    if (deposit.payment_provider !== provider) {
      console.warn("Rejected payment webhook: provider mismatch", {
        expected: deposit.payment_provider,
        received: provider,
        depositId: parsed.depositId,
      });
      return json({ ok: false, error: "provider_mismatch" }, 409);
    }
    if (provider === "grow_make" && !parsed.providerTxnId) {
      return json({ ok: false, error: "missing_provider_transaction_id" }, 400);
    }
    if (provider === "grow_make" && parsed.depositStatus === "paid" && parsed.grossAmount === null) {
      return json({ ok: false, error: "missing_gross_amount" }, 400);
    }
    if (
      provider === "grow_make" &&
      parsed.grossAmount !== null &&
      Math.abs(Number(deposit.gross_deposit_amount ?? 0) - parsed.grossAmount) > 0.01
    ) {
      console.warn("Rejected Make/Grow webhook: amount mismatch", {
        expected: deposit.gross_deposit_amount,
        received: parsed.grossAmount,
        depositId: parsed.depositId,
      });
      return json({ ok: false, error: "amount_mismatch" }, 409);
    }
    if (
      deposit.provider_transaction_id &&
      parsed.providerTxnId &&
      deposit.provider_transaction_id !== parsed.providerTxnId
    ) {
      console.warn("Rejected payment webhook: transaction mismatch", {
        existing: deposit.provider_transaction_id,
        received: parsed.providerTxnId,
        depositId: parsed.depositId,
      });
      return json({ ok: false, error: "transaction_mismatch" }, 409);
    }
    if (deposit.status === "paid" && parsed.depositStatus === "paid") {
      return json({ ok: true, idempotent: true });
    }

    const grossAmount = parsed.grossAmount;
    const feeAmount = parsed.processingFeeAmount;
    const netAmount = grossAmount !== null && feeAmount !== null
      ? Math.max(grossAmount - feeAmount, 0)
      : grossAmount;
    const supplierDeductionAmount = deposit.supplier_deduction_basis === "gross"
      ? grossAmount
      : netAmount;

    const update: Record<string, unknown> = {
      status: parsed.depositStatus,
      provider_transaction_id: parsed.providerTxnId,
      metadata: {
        provider_status: parsed.providerStatus,
        provider_fee_status: parsed.processingFeeStatus,
        raw: parsed.raw,
      },
    };
    if (grossAmount !== null) update.gross_deposit_amount = grossAmount;
    if (feeAmount !== null) update.payment_processing_fee_amount = feeAmount;
    update.payment_processing_fee_status = parsed.processingFeeStatus;
    if (netAmount !== null) {
      update.net_deposit_amount = netAmount;
    }
    if (supplierDeductionAmount !== null) {
      update.supplier_deduction_amount = supplierDeductionAmount;
    }
    if (parsed.depositStatus === "paid") update.paid_at = new Date().toISOString();
    if (parsed.depositStatus === "refunded")
      update.refunded_at = new Date().toISOString();

    const { error } = await admin
      .from("deposits")
      .update(update)
      .eq("id", parsed.depositId);
    if (error) throw error;

    return json({ ok: true });
  } catch (e) {
    if (e instanceof PaymentProviderError) {
      console.error("payment-webhook provider error", e.code, e.message);
      return json({ ok: false, error: e.code, missing_secrets: e.missingSecrets }, e.status);
    }
    console.error("payment-webhook error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function parseRequestBody(reqForForm: Request, rawBody: string): Promise<Record<string, unknown> | null> {
  const ctype = reqForForm.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) {
    return JSON.parse(rawBody || "{}") as Record<string, unknown>;
  }
  if (ctype.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }
  try {
    const form = await reqForForm.formData();
    const payload: Record<string, unknown> = {};
    form.forEach((v, k) => (payload[k] = String(v)));
    return payload;
  } catch {
    return null;
  }
}

function stringOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
