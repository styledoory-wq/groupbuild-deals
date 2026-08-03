import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CARDCOM_API_BASE,
  getCardcomCredentials,
  getCardcomWebhookSecret,
  getPaymentEnvironment,
  type PaymentEnvironment,
} from "../_shared/paymentEnv.ts";
import {
  DEPOSIT_SELECT,
  type DepositRow,
  settleDepositPaid,
  settleDepositUnpaid,
} from "../_shared/settleDeposit.ts";
import { sendJoinConfirmationEmail } from "../_shared/afterPayment.ts";

/**
 * Cardcom webhook — the ONLY path that can mark a participation-fee deposit as
 * paid and materialise the join (deal_interest).
 *
 * Endpoint: /functions/v1/cardcom-webhook?secret=<CARDCOM_WEBHOOK_SECRET>
 *
 * Security model (Cardcom does not sign its callbacks):
 *  1. The URL carries a shared secret that only Cardcom receives, at creation
 *     time, over TLS.
 *  2. The payload is NEVER trusted for the payment result. We re-query
 *     Cardcom's LowProfile/GetLpResult with our own API credentials and settle
 *     only on what Cardcom's API returns.
 *  3. The deposit's stored environment must match the environment whose
 *     terminal verified the transaction.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedSecret = getCardcomWebhookSecret();
    if (!expectedSecret) {
      console.error("[cardcom-webhook] CARDCOM_WEBHOOK_SECRET not configured");
      return json({ error: "not_configured" }, 503);
    }

    const url = new URL(req.url);
    const provided = url.searchParams.get("secret") ?? req.headers.get("x-cardcom-secret") ?? "";
    if (!timingSafeEqual(provided, expectedSecret)) {
      console.warn("[cardcom-webhook] rejected call with bad secret");
      return json({ error: "invalid_signature" }, 401);
    }

    const payload = await readPayload(req);
    const lowProfileId = pick(payload, ["LowProfileId", "lowprofilecode", "LowProfileCode"]);
    const returnValue = pick(payload, ["ReturnValue", "ReturnVal", "returnValue"]);
    if (!lowProfileId) {
      console.warn("[cardcom-webhook] payload without LowProfileId");
      return json({ ok: true, skipped: "no_low_profile_id" });
    }

    // Verify against Cardcom itself; the payload is only a trigger.
    const environment = getPaymentEnvironment();
    const verified = await verifyWithCardcom(lowProfileId, environment);
    if (!verified) {
      return json({ error: "verification_failed" }, 502);
    }

    const depositId = verified.returnValue || returnValue;
    if (!depositId) return json({ ok: true, skipped: "no_deposit_id", environment });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: dep, error: depErr } = await admin
      .from("deposits")
      .select(DEPOSIT_SELECT)
      .eq("id", depositId)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep) return json({ ok: true, missing_deposit: true, environment });

    const deposit = dep as DepositRow;

    // Cross-environment protection.
    if (deposit.payment_environment && deposit.payment_environment !== environment) {
      console.error("[cardcom-webhook] environment mismatch", {
        deposit: deposit.payment_environment,
        webhook: environment,
      });
      return json({ error: "environment_mismatch" }, 409);
    }

    if (!verified.approved) {
      await settleDepositUnpaid(admin, deposit, {
        provider: "cardcom",
        environment,
        status: "failed",
        auditMetadata: {
          low_profile_id: lowProfileId,
          response_code: verified.responseCode,
          description: verified.description,
        },
      });
      return json({ ok: true, deposit_id: deposit.id, status: "failed", environment });
    }

    // Amount integrity: never settle a deposit for less than it asks for.
    const expectedAmount = Number(deposit.amount ?? 0);
    if (
      verified.amount !== null && expectedAmount > 0 &&
      Math.abs(verified.amount - expectedAmount) > 0.01
    ) {
      console.error("[cardcom-webhook] amount mismatch", {
        expected: expectedAmount,
        charged: verified.amount,
      });
      await admin.from("deposit_audit_log").insert({
        deposit_id: deposit.id,
        action: "amount_mismatch",
        metadata: { expected: expectedAmount, charged: verified.amount, environment },
      });
      return json({ error: "amount_mismatch" }, 409);
    }

    const result = await settleDepositPaid(admin, deposit, {
      provider: "cardcom",
      environment,
      transactionId: verified.transactionId ?? lowProfileId,
      auditMetadata: { low_profile_id: lowProfileId },
    });

    // Join confirmation email. Idempotent by design (claims join_email_sent_at),
    // so a replayed webhook never mails twice, and a mail failure never undoes
    // the payment or the join.
    const emailResult = await sendJoinConfirmationEmail(admin, deposit.id);

    return json({
      ok: true,
      deposit_id: deposit.id,
      environment,
      first_time: result.firstTime,
      skipped: result.skipped,
      join_email: emailResult,
    });
  } catch (e) {
    console.error("[cardcom-webhook] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Cardcom may post form-encoded data.
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

type Verification = {
  approved: boolean;
  responseCode: number;
  description: string | null;
  amount: number | null;
  transactionId: string | null;
  returnValue: string | null;
};

/** Server-to-server confirmation. The webhook body is never trusted. */
async function verifyWithCardcom(
  lowProfileId: string,
  env: PaymentEnvironment,
): Promise<Verification | null> {
  const creds = getCardcomCredentials(env);
  if (!creds) {
    console.error("[cardcom-webhook] missing Cardcom credentials for environment", env);
    return null;
  }
  try {
    const res = await fetch(`${CARDCOM_API_BASE}/LowProfile/GetLpResult`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TerminalNumber: Number(creds.terminal),
        ApiName: creds.apiName,
        ApiPassword: creds.apiPassword,
        LowProfileId: lowProfileId,
      }),
    });
    const data = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      console.error("[cardcom-webhook] GetLpResult http error", res.status);
      return null;
    }
    const responseCode = Number(data.ResponseCode ?? -1);
    const tran = (data.TranzactionInfo ?? {}) as Record<string, unknown>;
    const tranCode = Number(tran.ResponseCode ?? responseCode);
    return {
      approved: responseCode === 0 && tranCode === 0,
      responseCode,
      description: typeof data.Description === "string" ? data.Description : null,
      amount: typeof tran.Amount === "number" ? tran.Amount : null,
      transactionId: tran.TranzactionId != null ? String(tran.TranzactionId) : null,
      returnValue: typeof data.ReturnValue === "string" ? data.ReturnValue : null,
    };
  } catch (e) {
    console.error("[cardcom-webhook] GetLpResult failed", e);
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
