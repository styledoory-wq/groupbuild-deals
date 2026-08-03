/**
 * After-payment flows for participation fees.
 *
 * Two responsibilities, both strictly idempotent:
 *  1. `sendJoinConfirmationEmail` — one confirmation email per paid deposit.
 *  2. `refundParticipationDeposit` — real money back through Cardcom first,
 *     only then the record flips to "refunded" and the resident is told.
 *
 * Nothing here may ever throw into the caller's critical path: a failed email
 * must never cancel a payment or a join.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CARDCOM_API_BASE,
  getCardcomCredentials,
  getPaymentEnvironment,
  type PaymentEnvironment,
} from "./paymentEnv.ts";

const SITE_URL = "https://groupbuild.co.il";

export type FullDepositRow = {
  id: string;
  user_id: string | null;
  deal_id: string | null;
  status: string;
  amount: number | null;
  platform_fee_amount: number | null;
  payment_kind: string | null;
  payment_provider: string | null;
  payment_environment: string | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  refund_status: string | null;
  join_email_sent_at: string | null;
  refund_email_sent_at: string | null;
};

export const FULL_DEPOSIT_SELECT =
  "id,user_id,deal_id,status,amount,platform_fee_amount,payment_kind,payment_provider," +
  "payment_environment,provider_transaction_id,paid_at,refund_status,join_email_sent_at,refund_email_sent_at";

type DealInfo = { id: string; title: string; supplierName: string | null };

async function loadDeal(admin: SupabaseClient, dealId: string | null): Promise<DealInfo | null> {
  if (!dealId) return null;
  const { data } = await admin
    .from("deals")
    .select("id,title,supplier_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!data) return null;
  let supplierName: string | null = null;
  if (data.supplier_id) {
    const { data: sup } = await admin
      .from("suppliers")
      .select("business_name")
      .eq("id", data.supplier_id)
      .maybeSingle();
    supplierName = (sup?.business_name as string) ?? null;
  }
  return { id: String(data.id), title: (data.title as string) ?? "העסקה שלך", supplierName };
}

async function loadUserEmail(
  admin: SupabaseClient,
  userId: string | null,
): Promise<{ email: string | null; name: string | null }> {
  if (!userId) return { email: null, name: null };
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name,email")
    .eq("id", userId)
    .maybeSingle();
  let email = (profile?.email as string) ?? null;
  if (!email) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    email = authUser?.user?.email ?? null;
  }
  return { email, name: (profile?.full_name as string) ?? null };
}

async function logEmail(
  admin: SupabaseClient,
  entry: {
    message_id: string;
    template_name: string;
    recipient_email: string;
    status: string;
    error_message?: string | null;
  },
) {
  try {
    await admin.from("email_send_log").insert(entry);
  } catch (_) {
    // logging must never break the flow
  }
}

/* ------------------------------------------------------------------ *
 * 1. Join confirmation email
 * ------------------------------------------------------------------ */

export async function sendJoinConfirmationEmail(
  admin: SupabaseClient,
  depositId: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    // Atomic claim: only the first caller gets the row back, so a replayed
    // webhook can never produce a second email.
    const { data: claimed } = await admin
      .from("deposits")
      .update({ join_email_sent_at: new Date().toISOString() })
      .eq("id", depositId)
      .eq("status", "paid")
      .is("join_email_sent_at", null)
      .select(FULL_DEPOSIT_SELECT);

    if (!Array.isArray(claimed) || claimed.length === 0) {
      return { sent: false, reason: "already_sent_or_not_paid" };
    }
    const dep = claimed[0] as FullDepositRow;

    const [deal, user] = await Promise.all([
      loadDeal(admin, dep.deal_id),
      loadUserEmail(admin, dep.user_id),
    ]);
    if (!user.email) {
      await logEmail(admin, {
        message_id: `join-confirm-${dep.id}`,
        template_name: "join-confirmation",
        recipient_email: "unknown",
        status: "failed",
        error_message: "recipient email not found",
      });
      return { sent: false, reason: "no_email" };
    }

    const amount = Number(dep.platform_fee_amount ?? dep.amount ?? 0);
    const paidAt = dep.paid_at ?? new Date().toISOString();
    const templateData = {
      name: user.name ?? undefined,
      dealTitle: deal?.title ?? "העסקה שלך",
      supplierName: deal?.supplierName ?? undefined,
      amount,
      currency: "₪",
      paidAt: new Date(paidAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
      reference: dep.provider_transaction_id ?? dep.id,
      dealUrl: deal ? `${SITE_URL}/deal/${deal.id}` : `${SITE_URL}/deals`,
    };

    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "join-confirmation",
        recipientEmail: user.email,
        idempotencyKey: `join-confirm-${dep.id}`,
        templateData,
      },
    });

    if (error) {
      console.error("[afterPayment] join email failed", error);
      await logEmail(admin, {
        message_id: `join-confirm-${dep.id}`,
        template_name: "join-confirmation",
        recipient_email: user.email,
        status: "failed",
        error_message: String((error as { message?: string }).message ?? error),
      });
      await admin.from("deposit_audit_log").insert({
        deposit_id: dep.id,
        action: "join_email_failed",
        metadata: { error: String((error as { message?: string }).message ?? error) },
      });
      return { sent: false, reason: "send_failed" };
    }

    await admin.from("deposit_audit_log").insert({
      deposit_id: dep.id,
      action: "join_email_sent",
      metadata: { recipient: user.email, deal_id: dep.deal_id },
    });
    return { sent: true };
  } catch (e) {
    // Never propagate: payment + join stay intact regardless of email issues.
    console.error("[afterPayment] join email error", e);
    return { sent: false, reason: "exception" };
  }
}

/* ------------------------------------------------------------------ *
 * 2. Refund
 * ------------------------------------------------------------------ */

export type RefundOutcome = {
  deposit_id: string;
  status: "refunded" | "failed" | "skipped";
  reason?: string;
  amount?: number;
  provider_refund_id?: string | null;
  error_code?: string | null;
  error_description?: string | null;
};

export async function refundParticipationDeposit(
  admin: SupabaseClient,
  depositId: string,
  opts: { reason: string; actorId?: string | null; trigger: string },
): Promise<RefundOutcome> {
  const { data: depRow } = await admin
    .from("deposits")
    .select(FULL_DEPOSIT_SELECT)
    .eq("id", depositId)
    .maybeSingle();
  const dep = depRow as FullDepositRow | null;
  if (!dep) return { deposit_id: depositId, status: "skipped", reason: "not_found" };
  if (dep.status === "refunded" || dep.refund_status === "refunded") {
    return { deposit_id: depositId, status: "skipped", reason: "already_refunded" };
  }
  if (dep.status !== "paid") {
    return { deposit_id: depositId, status: "skipped", reason: "not_paid" };
  }
  if (dep.payment_provider !== "cardcom") {
    return { deposit_id: depositId, status: "skipped", reason: "provider_mismatch" };
  }
  if (!dep.provider_transaction_id) {
    return { deposit_id: depositId, status: "skipped", reason: "missing_transaction_id" };
  }

  // Atomic claim — a second cron run or a double click cannot enter here.
  const { data: claimed } = await admin
    .from("deposits")
    .update({
      refund_status: "processing",
      refund_reason: opts.reason,
      last_refund_attempt_at: new Date().toISOString(),
    })
    .eq("id", depositId)
    .eq("status", "paid")
    .or("refund_status.is.null,refund_status.eq.failed,refund_status.eq.pending")
    .select("id");
  if (!Array.isArray(claimed) || claimed.length === 0) {
    return { deposit_id: depositId, status: "skipped", reason: "refund_in_progress" };
  }

  const environment = (dep.payment_environment as PaymentEnvironment) ?? getPaymentEnvironment();
  const creds = getCardcomCredentials(environment);
  const amount = Number(dep.amount ?? dep.platform_fee_amount ?? 0);

  if (!creds) {
    return await markRefundFailed(admin, dep, opts, {
      code: "provider_not_configured",
      description: "Cardcom credentials missing",
      environment,
    });
  }

  let code = -1;
  let description: string | null = null;
  let refundId: string | null = null;
  try {
    const res = await fetch(`${CARDCOM_API_BASE}/Transactions/RefundByTransactionId`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ApiName: creds.apiName,
        ApiPassword: creds.apiPassword,
        TerminalNumber: Number(creds.terminal),
        TransactionId: Number(dep.provider_transaction_id),
        PartialSum: amount,
      }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    code = Number(data?.ResponseCode ?? -1);
    description = typeof data?.Description === "string" ? data.Description : null;
    refundId = data?.TranzactionId != null ? String(data.TranzactionId) : null;
    if (!res.ok || code !== 0) {
      return await markRefundFailed(admin, dep, opts, {
        code: String(code),
        description: description ?? `HTTP ${res.status}`,
        environment,
      });
    }
  } catch (e) {
    return await markRefundFailed(admin, dep, opts, {
      code: "network_error",
      description: String(e),
      environment,
    });
  }

  // Provider confirmed — only now does the record change.
  const nowIso = new Date().toISOString();
  await admin
    .from("deposits")
    .update({
      status: "refunded",
      refunded_at: nowIso,
      refund_status: "refunded",
      refund_reason: opts.reason,
      refund_error_code: null,
      refund_error_description: null,
      provider_refund_id: refundId,
    })
    .eq("id", dep.id);

  if (dep.user_id && dep.deal_id) {
    await admin
      .from("deal_interests")
      .update({
        status: "refunded",
        participation_status: "refunded",
        deposit_status: "refunded",
      })
      .eq("user_id", dep.user_id)
      .eq("deal_id", dep.deal_id);
  }

  await admin.from("deposit_audit_log").insert({
    deposit_id: dep.id,
    action: "refunded",
    user_id: opts.actorId ?? null,
    metadata: {
      environment,
      amount,
      reason: opts.reason,
      trigger: opts.trigger,
      provider_refund_id: refundId,
      transaction_id: dep.provider_transaction_id,
    },
  });

  await notifyResidentRefund(admin, dep, { amount, reason: opts.reason, refundedAt: nowIso });

  return {
    deposit_id: dep.id,
    status: "refunded",
    amount,
    provider_refund_id: refundId,
  };
}

async function markRefundFailed(
  admin: SupabaseClient,
  dep: FullDepositRow,
  opts: { reason: string; actorId?: string | null; trigger: string },
  err: { code: string; description: string | null; environment: string },
): Promise<RefundOutcome> {
  console.error("[afterPayment] refund failed", { deposit: dep.id, ...err });
  const { data: current } = await admin
    .from("deposits")
    .select("refund_attempts")
    .eq("id", dep.id)
    .maybeSingle();
  await admin
    .from("deposits")
    .update({
      refund_status: "failed",
      refund_error_code: err.code,
      refund_error_description: err.description,
      refund_attempts: Number(current?.refund_attempts ?? 0) + 1,
    })
    .eq("id", dep.id);

  await admin.from("deposit_audit_log").insert({
    deposit_id: dep.id,
    action: "refund_failed",
    user_id: opts.actorId ?? null,
    metadata: {
      environment: err.environment,
      response_code: err.code,
      description: err.description,
      reason: opts.reason,
      trigger: opts.trigger,
    },
  });

  // Critical admin alert — the resident is intentionally NOT told anything.
  try {
    await admin.rpc("notify_admins", {
      _title: "כשל בהחזר כספי",
      _body: `החזר דמי השתתפות נכשל (${err.code}). נדרש טיפול ידני.`,
      _type: "system",
      _link: "/admin/deposits",
      _metadata: {
        deposit_id: dep.id,
        deal_id: dep.deal_id,
        error_code: err.code,
        error_description: err.description,
        severity: "critical",
      },
    });
  } catch (e) {
    console.error("[afterPayment] admin alert failed", e);
  }

  return {
    deposit_id: dep.id,
    status: "failed",
    error_code: err.code,
    error_description: err.description,
  };
}

async function notifyResidentRefund(
  admin: SupabaseClient,
  dep: FullDepositRow,
  info: { amount: number; reason: string; refundedAt: string },
) {
  try {
    const deal = await loadDeal(admin, dep.deal_id);
    const dealTitle = deal?.title ?? "העסקה";
    const title = "בוצע החזר כספי";
    const body =
      `העסקה "${dealTitle}" לא יצאה לפועל ולכן הוחזרו לך ₪${info.amount}. הזיכוי בוצע לכרטיס שבו שילמת.`;

    // In-app notification
    if (dep.user_id) {
      await admin.rpc("notify_user", {
        _user_id: dep.user_id,
        _title: title,
        _body: body,
        _type: "deposit",
        _link: deal ? `/deal/${deal.id}` : "/my-deposits",
        _metadata: {
          deposit_id: dep.id,
          deal_id: dep.deal_id,
          amount: info.amount,
          reason: info.reason,
          kind: "refund",
        },
      });

      // Push
      try {
        await admin.functions.invoke("send-push", {
          body: {
            user_id: dep.user_id,
            event: "deposit",
            title,
            body,
            url: deal ? `/deal/${deal.id}` : "/my-deposits",
            data: { deposit_id: dep.id, kind: "refund" },
          },
        });
      } catch (e) {
        console.error("[afterPayment] refund push failed", e);
      }
    }

    // Email — claimed atomically so a retry can't double-send.
    const { data: claimed } = await admin
      .from("deposits")
      .update({ refund_email_sent_at: new Date().toISOString() })
      .eq("id", dep.id)
      .is("refund_email_sent_at", null)
      .select("id");
    if (!Array.isArray(claimed) || claimed.length === 0) return;

    const user = await loadUserEmail(admin, dep.user_id);
    if (!user.email) return;

    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "refund-notice",
        recipientEmail: user.email,
        idempotencyKey: `refund-notice-${dep.id}`,
        templateData: {
          name: user.name ?? undefined,
          dealTitle,
          amount: info.amount,
          currency: "₪",
          reason: info.reason,
          refundedAt: new Date(info.refundedAt).toLocaleString("he-IL", {
            timeZone: "Asia/Jerusalem",
          }),
          dealUrl: deal ? `${SITE_URL}/deal/${deal.id}` : `${SITE_URL}/my-deposits`,
        },
      },
    });
    if (error) {
      await logEmail(admin, {
        message_id: `refund-notice-${dep.id}`,
        template_name: "refund-notice",
        recipient_email: user.email,
        status: "failed",
        error_message: String((error as { message?: string }).message ?? error),
      });
    }
  } catch (e) {
    console.error("[afterPayment] refund notification error", e);
  }
}
