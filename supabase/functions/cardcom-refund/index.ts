import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refundParticipationDeposit } from "../_shared/afterPayment.ts";

/**
 * cardcom-refund — admin-only refund of a settled participation fee.
 *
 * Also serves as the manual retry path for a refund that previously failed.
 * All money movement and state changes live in the shared refund routine, so
 * the automatic (cron) path and this manual path behave identically.
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

    const body = (await req.json().catch(() => ({}))) as {
      deposit_id?: string;
      reason?: string;
      retry?: boolean;
    };
    if (!body.deposit_id) return json({ error: "invalid_request" }, 400);

    const outcome = await refundParticipationDeposit(admin, body.deposit_id, {
      reason: body.reason ?? "החזר יזום על ידי מנהל",
      actorId: userId,
      trigger: body.retry ? "admin_retry" : "admin_manual",
    });

    if (outcome.status === "refunded") return json({ ok: true, ...outcome });
    if (outcome.status === "failed") {
      return json(
        { error: "refund_failed", description: outcome.error_description, ...outcome },
        502,
      );
    }
    return json({ error: outcome.reason ?? "not_refundable", ...outcome }, 409);
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
