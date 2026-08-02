import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CARDCOM_API_BASE,
  getCardcomCredentials,
  getPaymentEnvironment,
} from "../_shared/paymentEnv.ts";

/**
 * cardcom-refund — admin-only refund of a settled participation fee.
 *
 * The money is refunded at Cardcom FIRST; only a successful provider refund
 * flips the deposit to "refunded". Never the other way around.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as { deposit_id?: string; reason?: string };
    if (!body.deposit_id) return json({ error: "invalid_request" }, 400);

    const { data: dep, error: depErr } = await admin
      .from("deposits")
      .select("id,status,amount,payment_provider,payment_environment,provider_transaction_id")
      .eq("id", body.deposit_id)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep) return json({ error: "deposit_not_found" }, 404);
    if (dep.status !== "paid") return json({ error: "not_refundable" }, 409);
    if (dep.payment_provider !== "cardcom") {
      return json({ error: "provider_mismatch", provider: dep.payment_provider }, 409);
    }
    if (!dep.provider_transaction_id) {
      return json({ error: "missing_transaction_id" }, 409);
    }

    const environment = (dep.payment_environment as "test" | "production") ??
      getPaymentEnvironment();
    const creds = getCardcomCredentials(environment);
    if (!creds) return json({ error: "provider_not_configured" }, 503);

    const res = await fetch(`${CARDCOM_API_BASE}/Transactions/RefundByTransactionId`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ApiName: creds.apiName,
        ApiPassword: creds.apiPassword,
        TerminalNumber: Number(creds.terminal),
        TransactionId: Number(dep.provider_transaction_id),
        PartialSum: Number(dep.amount ?? 0),
      }),
    });
    const data = await res.json().catch(() => null) as Record<string, unknown> | null;
    const code = Number(data?.ResponseCode ?? -1);
    if (!res.ok || code !== 0) {
      console.error("[cardcom-refund] provider refused", { http: res.status, data });
      await admin.from("deposit_audit_log").insert({
        deposit_id: dep.id,
        action: "refund_failed",
        user_id: userId,
        metadata: { environment, response_code: code, description: data?.Description ?? null },
      });
      return json({ error: "refund_failed", description: data?.Description ?? null }, 502);
    }

    await admin
      .from("deposits")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", dep.id)
      .eq("status", "paid");

    await admin
      .from("deposit_audit_log")
      .insert({
        deposit_id: dep.id,
        action: "refunded",
        user_id: userId,
        metadata: { environment, reason: body.reason ?? null, amount: dep.amount },
      });

    return json({ ok: true, deposit_id: dep.id, environment });
  } catch (e) {
    console.error("[cardcom-refund] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
