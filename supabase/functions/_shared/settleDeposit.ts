/**
 * Shared settlement logic for participation-fee deposits.
 *
 * This is the ONLY place where a deposit becomes "paid" and where the join
 * (deal_interest) is materialised. Both provider webhooks call into it, so the
 * business rules — Payment Before Join, idempotency, environment isolation —
 * are identical regardless of which payment provider is active.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PaymentEnvironment, SupportedProvider } from "./paymentEnv.ts";

export type DepositRow = {
  id: string;
  user_id: string | null;
  deal_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  payment_kind: string | null;
  amount: number | null;
  platform_fee_amount: number | null;
  payment_environment: string | null;
  credit_amount?: number | null;
  card_amount?: number | null;
};

export const DEPOSIT_SELECT =
  "id,user_id,deal_id,status,metadata,payment_kind,amount,platform_fee_amount,payment_environment,credit_amount,card_amount";

/** Marks a deposit as paid (idempotently) and creates/updates the join. */
export async function settleDepositPaid(
  admin: SupabaseClient,
  dep: DepositRow,
  opts: {
    provider: SupportedProvider;
    environment: PaymentEnvironment;
    transactionId: string | null;
    auditMetadata?: Record<string, unknown>;
  },
): Promise<{ firstTime: boolean; skipped?: string }> {
  const nowIso = new Date().toISOString();

  // Idempotency: only the transition into "paid" performs work.
  const { data: claimed } = await admin
    .from("deposits")
    .update({
      status: "paid",
      paid_at: nowIso,
      payment_provider: opts.provider,
      payment_environment: opts.environment,
      provider_transaction_id: opts.transactionId,
      provider_payment_url: null,
    })
    .eq("id", dep.id)
    .in("status", ["pending", "awaiting_confirmation", "expired", "failed"])
    .select("id");

  const firstTime = Array.isArray(claimed) && claimed.length > 0;
  if (!firstTime && dep.status !== "paid") {
    return { firstTime: false, skipped: "state_conflict" };
  }

  if (dep.user_id && dep.deal_id) {
    const meta = (dep.metadata ?? {}) as { join_payload?: Record<string, unknown> };
    const join = meta.join_payload ?? {};
    const feeAmount = Number(dep.platform_fee_amount ?? dep.amount ?? 0);
    const common = {
      status: "paid",
      deposit_status: "paid",
      participation_status: "paid",
      deposit_required: true,
      deposit_amount: feeAmount,
    };

    // Idempotent upsert against the (user_id, deal_id) unique index:
    // a duplicate or concurrent webhook can never create a second join.
    const { error: upsertErr } = await admin
      .from("deal_interests")
      .upsert(
        {
          user_id: dep.user_id,
          deal_id: dep.deal_id,
          ...common,
          full_name: (join.full_name as string) ?? null,
          phone: (join.phone as string) ?? null,
          city: (join.city as string) ?? null,
          project_name: (join.project_name as string) ?? null,
          notes: (join.notes as string) ?? null,
          estimated_quantity: (join.estimated_quantity as number) ?? null,
          terms_accepted_at: (join.terms_accepted_at as string) ?? nowIso,
          join_condition: (join.join_condition as string) ?? null,
          min_tier_locked: (join.min_tier_locked as number) ?? null,
          conditional_status: "ok",
          lead_status: "new",
          is_deleted: false,
        },
        { onConflict: "user_id,deal_id" },
      );
    if (upsertErr) {
      // 23505 = unique_violation → another concurrent webhook won the race.
      if ((upsertErr as { code?: string }).code !== "23505") throw upsertErr;
      await admin
        .from("deal_interests")
        .update(common)
        .eq("user_id", dep.user_id)
        .eq("deal_id", dep.deal_id);
    }
  }

  // Finalize any pending credit reservation for this deposit.
  if (firstTime && Number(dep.credit_amount ?? 0) > 0) {
    try {
      await admin.rpc("finalize_credit_for_deposit", { _deposit_id: dep.id });
    } catch (e) {
      console.error("[settleDeposit] finalize credit failed", e);
    }
  }

  if (firstTime) {
    await admin.from("deposit_audit_log").insert({
      deposit_id: dep.id,
      action: "webhook_marked_paid",
      metadata: {
        provider: opts.provider,
        environment: opts.environment,
        transaction_id: opts.transactionId,
        amount: dep.amount,
        credit_amount: dep.credit_amount ?? 0,
        card_amount: dep.card_amount ?? null,
        ...(opts.auditMetadata ?? {}),
      },
    });
  }

  return { firstTime };
}

/** Marks an abandoned or failed checkout without ever touching a paid deposit. */
export async function settleDepositUnpaid(
  admin: SupabaseClient,
  dep: DepositRow,
  opts: {
    provider: SupportedProvider;
    environment: PaymentEnvironment;
    status: "expired" | "failed" | "cancelled";
    auditMetadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (dep.status === "paid") return;
  await admin
    .from("deposits")
    .update({ status: opts.status, provider_payment_url: null })
    .eq("id", dep.id)
    .in("status", ["pending", "awaiting_confirmation"]);

  // Release any reserved credit so the resident can use it again.
  if (Number(dep.credit_amount ?? 0) > 0) {
    try {
      await admin.rpc("release_credit_reservation", { _deposit_id: dep.id });
    } catch (e) {
      console.error("[settleDeposit] release credit failed", e);
    }
  }

  await admin.from("deposit_audit_log").insert({
    deposit_id: dep.id,
    action: opts.status === "expired" ? "checkout_expired" : "checkout_failed",
    metadata: {
      provider: opts.provider,
      environment: opts.environment,
      ...(opts.auditMetadata ?? {}),
    },
  });
}
