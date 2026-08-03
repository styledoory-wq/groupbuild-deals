import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refundParticipationDeposit, type RefundOutcome } from "../_shared/afterPayment.ts";

/**
 * process-deal-refunds — the automatic refund engine.
 *
 * A deal is considered "not fulfilled" when any of these hold:
 *   1. the supplier or an admin cancelled it (status cancelled/failed, or deleted)
 *   2. its join deadline (join_deadline ?? ends_at) has passed and the paid
 *      participant count is below target_participants
 *   3. it was closed/deactivated after its deadline without reaching the target
 *
 * Triggers:
 *   - pg_cron, every 15 minutes (deadline misses + retry of failed refunds)
 *   - admin action with { deal_id, force: true } for an immediate cancellation
 *
 * Every refund goes through the same shared, idempotent routine, so running
 * this twice — or in parallel with an admin click — cannot refund twice.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_AUTO_RETRIES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: service role (cron) or an authenticated admin user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  let actorId: string | null = null;
  const isServiceRole = !!token && await isServiceRoleToken(token);
  if (!isServiceRole) {
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: userData } = await admin.auth.getUser(token);
    actorId = userData?.user?.id ?? null;
    if (!actorId) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: actorId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      deal_id?: string;
      reason?: string;
      force?: boolean;
      dry_run?: boolean;
    };

    const nowIso = new Date().toISOString();
    const { data: deals, error: dealsErr } = await admin
      .from("deals")
      .select("id,title,status,is_deleted,ends_at,join_deadline,target_participants");
    if (dealsErr) throw dealsErr;

    const candidates: { id: string; title: string; reason: string }[] = [];

    for (const d of deals ?? []) {
      const id = String(d.id);
      if (body.deal_id && id !== body.deal_id) continue;

      const deadline = (d.join_deadline ?? d.ends_at) as string | null;
      const deadlinePassed = !!deadline && deadline < nowIso;
      const target = Number(d.target_participants ?? 0);

      let reason: string | null = null;
      if (body.deal_id && body.force) {
        reason = body.reason ?? "העסקה בוטלה";
      } else if (d.is_deleted || d.status === "cancelled" || d.status === "failed") {
        reason = "העסקה בוטלה";
      } else if (deadlinePassed && target > 0) {
        const { data: paidCount } = await admin.rpc("get_deal_paid_count", { _deal_id: id });
        if (Number(paidCount ?? 0) < target) {
          reason = "העסקה לא הגיעה למספר המשתתפים הנדרש";
        }
      }
      if (reason) candidates.push({ id, title: (d.title as string) ?? "", reason });
    }

    const results: (RefundOutcome & { deal_id: string })[] = [];

    for (const deal of candidates) {
      const { data: deposits, error: depErr } = await admin
        .from("deposits")
        .select("id,status,refund_status,refund_attempts")
        .eq("deal_id", deal.id)
        .eq("payment_kind", "participation_fee")
        .eq("status", "paid");
      if (depErr) {
        console.error("[process-deal-refunds] deposit query failed", deal.id, depErr);
        continue;
      }

      for (const dep of deposits ?? []) {
        // Already refunded rows are excluded by status = 'paid'.
        // Cap automatic retries; admins can still retry manually forever.
        if (
          isServiceRole && dep.refund_status === "failed" &&
          Number(dep.refund_attempts ?? 0) >= MAX_AUTO_RETRIES
        ) {
          results.push({
            deposit_id: dep.id,
            deal_id: deal.id,
            status: "skipped",
            reason: "max_auto_retries",
          });
          continue;
        }
        if (body.dry_run) {
          results.push({
            deposit_id: dep.id,
            deal_id: deal.id,
            status: "skipped",
            reason: "dry_run",
          });
          continue;
        }
        // One failure never stops the rest.
        try {
          const outcome = await refundParticipationDeposit(admin, dep.id, {
            reason: deal.reason,
            actorId,
            trigger: isServiceRole ? "cron_auto" : "admin_bulk",
          });
          results.push({ ...outcome, deal_id: deal.id });
        } catch (e) {
          console.error("[process-deal-refunds] refund threw", dep.id, e);
          results.push({
            deposit_id: dep.id,
            deal_id: deal.id,
            status: "failed",
            error_code: "exception",
            error_description: String(e),
          });
        }
      }
    }

    const summary = {
      deals_considered: candidates.length,
      refunded: results.filter((r) => r.status === "refunded").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    };
    console.log("[process-deal-refunds] done", summary);
    return json({ ok: true, ...summary, deals: candidates, results });
  } catch (e) {
    console.error("[process-deal-refunds] error", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});

/**
 * Accepts either the function's own service-role key or any valid service-role
 * key issued for this project (the cron job reads one from Vault). Validity is
 * proven against PostgREST — a rotated or forged key cannot pass.
 */
async function isServiceRoleToken(token: string): Promise<boolean> {
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: string };
    if (payload.role !== "service_role") return false;
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/user_roles?select=user_id&limit=1`,
      { headers: { apikey: token, Authorization: `Bearer ${token}` } },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
