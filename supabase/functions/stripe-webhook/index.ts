import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getStripeWebhookSecrets,
  type PaymentEnvironment,
} from "../_shared/paymentEnv.ts";

/**
 * Stripe webhook — the ONLY path that can mark a participation-fee deposit as
 * paid and materialise the join (deal_interest).
 *
 * Endpoint: /functions/v1/stripe-webhook
 * Secrets:  STRIPE_WEBHOOK_SECRET_TEST (test mode endpoint)
 *           STRIPE_WEBHOOK_SECRET_LIVE (live mode endpoint)
 *
 * The environment is derived from WHICH signing secret verified the event, so
 * a test event can never mutate a production deposit and vice versa.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secrets = getStripeWebhookSecrets();
    if (secrets.length === 0) {
      console.error("[stripe-webhook] no STRIPE_WEBHOOK_SECRET_TEST/LIVE configured");
      return json({ error: "not_configured" }, 503);
    }

    const body = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    const verified = await verifyStripeEvent(body, sig, secrets);
    if (!verified) return json({ error: "invalid_signature" }, 400);

    const { event, environment } = verified;
    const handled = [
      "checkout.session.completed",
      "checkout.session.expired",
      "checkout.session.async_payment_failed",
      "payment_intent.payment_failed",
    ];
    if (!handled.includes(event.type)) {
      return json({ ok: true, ignored: event.type, environment });
    }

    const session = (event.data?.object ?? {}) as Record<string, unknown> & {
      metadata?: Record<string, string>;
      client_reference_id?: string;
      payment_status?: string;
      id?: string;
      payment_intent?: string;
    };
    const depositId = session.metadata?.deposit_id ?? session.client_reference_id ?? null;
    if (!depositId) return json({ ok: true, skipped: "no_deposit_id", environment });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: dep, error: depErr } = await admin
      .from("deposits")
      .select(
        "id,user_id,deal_id,status,metadata,payment_kind,amount,platform_fee_amount,payment_environment",
      )
      .eq("id", depositId)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep) return json({ ok: true, missing_deposit: true, environment });

    // Cross-environment protection.
    if (dep.payment_environment && dep.payment_environment !== environment) {
      console.error("[stripe-webhook] environment mismatch", {
        deposit: dep.payment_environment,
        event: environment,
      });
      return json({ error: "environment_mismatch" }, 409);
    }

    const nowIso = new Date().toISOString();

    // ---- Abandoned / failed checkouts -------------------------------------
    if (event.type !== "checkout.session.completed") {
      if (dep.status === "paid") return json({ ok: true, already_paid: true, environment });
      const nextStatus = event.type === "checkout.session.expired" ? "expired" : "failed";
      await admin
        .from("deposits")
        .update({ status: nextStatus, provider_payment_url: null })
        .eq("id", dep.id)
        .in("status", ["pending", "awaiting_confirmation"]);
      await admin.from("deposit_audit_log").insert({
        deposit_id: dep.id,
        action: nextStatus === "expired" ? "checkout_expired" : "checkout_failed",
        metadata: { stripe_event: event.type, environment, session_id: session.id ?? null },
      });
      return json({ ok: true, deposit_id: dep.id, status: nextStatus, environment });
    }

    // ---- Successful payment ----------------------------------------------
    if (session.payment_status !== "paid") {
      return json({ ok: true, skipped: "not_paid", environment });
    }

    // Idempotency: only the transition pending → paid does work.
    const { data: claimed } = await admin
      .from("deposits")
      .update({
        status: "paid",
        paid_at: nowIso,
        payment_provider: "stripe",
        payment_environment: environment,
        provider_transaction_id: (session.id as string) ??
          (session.payment_intent as string) ?? null,
      })
      .eq("id", dep.id)
      .in("status", ["pending", "awaiting_confirmation", "expired", "failed"])
      .select("id");

    const firstTime = Array.isArray(claimed) && claimed.length > 0;
    if (!firstTime && dep.status !== "paid") {
      return json({ ok: true, skipped: "state_conflict", environment });
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

    if (firstTime) {
      await admin.from("deposit_audit_log").insert({
        deposit_id: dep.id,
        action: "webhook_marked_paid",
        metadata: { environment, session_id: session.id ?? null, amount: dep.amount },
      });
    }

    return json({ ok: true, deposit_id: dep.id, environment, first_time: firstTime });
  } catch (e) {
    console.error("[stripe-webhook] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

type StripeEvent = {
  type: string;
  data?: { object?: Record<string, unknown> };
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies against every configured secret; the matching one determines the environment. */
async function verifyStripeEvent(
  payload: string,
  header: string,
  secrets: Array<{ env: PaymentEnvironment; secret: string }>,
): Promise<{ event: StripeEvent; environment: PaymentEnvironment } | null> {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k?.trim(), v];
      }),
    ) as Record<string, string>;
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return null;

    // Replay protection: 5 minute tolerance.
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      console.warn("[stripe-webhook] timestamp outside tolerance");
      return null;
    }

    for (const { env, secret } of secrets) {
      const expected = await hmacHex(secret, `${timestamp}.${payload}`);
      if (timingSafeEqual(expected, signature)) {
        return { event: JSON.parse(payload) as StripeEvent, environment: env };
      }
    }
    console.warn("[stripe-webhook] signature did not match any configured secret");
    return null;
  } catch (e) {
    console.error("[stripe-webhook] verify failed", e);
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
