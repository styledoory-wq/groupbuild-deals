import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Stripe webhook — marks participation-fee deposits as paid and completes join.
 * Configure endpoint: /functions/v1/stripe-webhook
 * Secret: STRIPE_WEBHOOK_SECRET
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret || !stripeKey) {
      console.error("[stripe-webhook] missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
      return json({ error: "not_configured" }, 503);
    }

    const body = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    // Verify signature via Stripe API (constructEvent equivalent using fetch to Stripe is complex;
    // we parse the event after a lightweight HMAC check when Web Crypto is available).
    const event = await verifyStripeEvent(body, sig, secret);
    if (!event) {
      return json({ error: "invalid_signature" }, 400);
    }

    if (event.type !== "checkout.session.completed") {
      return json({ ok: true, ignored: event.type });
    }

    const session = event.data?.object ?? {};
    const depositId =
      session.metadata?.deposit_id ??
      session.client_reference_id ??
      null;
    const paymentStatus = session.payment_status;
    if (!depositId || paymentStatus !== "paid") {
      return json({ ok: true, skipped: true });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: dep, error: depErr } = await admin
      .from("deposits")
      .select("id,user_id,deal_id,status,metadata,payment_kind,amount,platform_fee_amount")
      .eq("id", depositId)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep) return json({ ok: true, missing_deposit: true });
    if (dep.status === "paid") return json({ ok: true, already_paid: true });

    const nowIso = new Date().toISOString();
    const { error: upErr } = await admin
      .from("deposits")
      .update({
        status: "paid",
        paid_at: nowIso,
        payment_provider: "stripe",
        provider_transaction_id: session.id ?? session.payment_intent ?? null,
      })
      .eq("id", depositId);
    if (upErr) throw upErr;

    // The join record is created ONLY here, after the payment is confirmed.
    // Idempotent: a duplicate webhook updates the existing row instead of
    // creating a second participation.
    if (dep.user_id && dep.deal_id) {
      const meta = (dep.metadata ?? {}) as {
        join_payload?: Record<string, unknown>;
        interest_id?: string;
      };
      const join = meta.join_payload ?? {};
      const feeAmount = Number(dep.platform_fee_amount ?? dep.amount ?? 0);

      const { data: existing } = await admin
        .from("deal_interests")
        .select("id")
        .eq("user_id", dep.user_id)
        .eq("deal_id", dep.deal_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const common = {
        status: "paid",
        deposit_status: "paid",
        participation_status: "paid",
        deposit_required: true,
        deposit_amount: feeAmount,
      };

      if (existing?.id) {
        await admin.from("deal_interests").update(common).eq("id", existing.id);
      } else {
        await admin.from("deal_interests").insert({
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
        });
      }
    }


    return json({ ok: true, deposit_id: depositId });
  } catch (e) {
    console.error("[stripe-webhook] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

type StripeEvent = {
  type: string;
  data?: { object?: Record<string, unknown> & { metadata?: Record<string, string>; payment_status?: string; id?: string; payment_intent?: string; client_reference_id?: string } };
};

async function verifyStripeEvent(
  payload: string,
  header: string,
  secret: string,
): Promise<StripeEvent | null> {
  try {
    // stripe-signature: t=timestamp,v1=signature
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k.trim(), v];
      }),
    );
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${timestamp}.${payload}`),
    );
    const expected = [...new Uint8Array(signed)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expected !== signature) {
      // Stripe signatures are hex; tolerate timing-safe compare miss by falling through
      console.warn("[stripe-webhook] signature mismatch");
      // Still accept in soft-dev if STRIPE_WEBHOOK_SOFT_VERIFY=1
      if (Deno.env.get("STRIPE_WEBHOOK_SOFT_VERIFY") !== "1") return null;
    }

    return JSON.parse(payload) as StripeEvent;
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
