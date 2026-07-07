// Sends automatic reminder emails ~3 days before deal join_deadline / ends_at.
// Triggered by pg_cron daily. Idempotent via deal_reminder_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REMINDER_KIND = "deadline_3d";
const WINDOW_DAYS = 3;

import { requireServiceRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const svc = requireServiceRole(req);
  if (!svc.ok) return svc.response;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find deals whose deadline falls roughly WINDOW_DAYS from now (active only).
    const now = new Date();
    const lower = new Date(now.getTime() + (WINDOW_DAYS - 0.5) * 86400000).toISOString();
    const upper = new Date(now.getTime() + (WINDOW_DAYS + 0.5) * 86400000).toISOString();

    const { data: deals, error: dealsErr } = await admin
      .from("deals")
      .select("id, title, join_deadline, ends_at, status, is_deleted")
      .eq("status", "active")
      .eq("is_deleted", false);
    if (dealsErr) throw dealsErr;

    const dueDeals = (deals ?? []).filter((d) => {
      const deadline = d.join_deadline ?? d.ends_at;
      if (!deadline) return false;
      return deadline >= lower && deadline <= upper;
    });

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const deal of dueDeals) {
      const deadlineIso = (deal.join_deadline ?? deal.ends_at) as string;
      const deadlineDate = deadlineIso.slice(0, 10);

      // Active joiners
      const { data: interests, error: intErr } = await admin
        .from("deal_interests")
        .select("user_id")
        .eq("deal_id", deal.id)
        .eq("is_deleted", false)
        .in("status", ["joined", "active", "interested", "confirmed"]);
      if (intErr) { console.error("interests error", intErr); continue; }

      const userIds = Array.from(new Set((interests ?? []).map((r) => r.user_id).filter(Boolean)));
      if (userIds.length === 0) continue;

      // Lookup emails via auth.admin (RPC not exposed; we read profiles for fallback name)
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      for (const uid of userIds) {
        processed++;
        // Dedupe via deal_reminder_log unique constraint
        const { error: insErr } = await admin
          .from("deal_reminder_log")
          .insert({
            deal_id: deal.id,
            user_id: uid,
            reminder_kind: REMINDER_KIND,
            deadline_date: deadlineDate,
          });
        if (insErr) {
          // unique_violation => already sent
          if ((insErr as any).code === "23505") { skipped++; continue; }
          console.error("reminder log insert error", insErr);
          failed++;
          continue;
        }

        // Fetch the user's email from auth
        const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(uid);
        if (userErr || !userRes?.user?.email) {
          failed++;
          continue;
        }
        const email = userRes.user.email;
        const name = profileMap.get(uid)?.full_name || null;

        const dealUrl = `https://groupbuild.co.il/deals/${deal.id}`;
        const daysLeft = Math.max(1, Math.round(
          (new Date(deadlineIso).getTime() - now.getTime()) / 86400000
        ));

        const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "deal-update",
            recipientEmail: email,
            idempotencyKey: `deal-reminder-${deal.id}-${uid}-${deadlineDate}`,
            templateData: {
              name,
              dealTitle: deal.title,
              message: `נותרו ${daysLeft} ימים לסגירת ההצטרפות לעסקה. אל תפספס/י!`,
              dealUrl,
            },
          },
        });
        if (sendErr) { failed++; console.error("send error", sendErr); }
        else sent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, dueDeals: dueDeals.length, processed, sent, skipped, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[send-deal-reminders]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
