// Edge function: delete-account
// Self-service account deletion (App Store / Google Play requirement).
// Authenticated user deletes their OWN account:
//   - removes profile-related rows (favorites, device_tokens, notifications, deposits-owner cleanup is preserved for audit)
//   - removes profile + user_roles rows
//   - deletes the auth user (frees the email for re-signup)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const userId = userRes.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Best-effort cleanup of user-owned rows. Errors are non-fatal —
    // the priority is removing the auth user so the email becomes reusable.
    const cleanup = async (fn: () => Promise<unknown>, label: string) => {
      try { await fn(); } catch (e) { console.warn(`[delete-account] ${label}`, e); }
    };

    await cleanup(() => admin.from("favorites").delete().eq("user_id", userId), "favorites");
    await cleanup(() => admin.from("device_tokens").delete().eq("user_id", userId), "device_tokens");
    await cleanup(() => admin.from("notifications").delete().eq("user_id", userId), "notifications");
    await cleanup(() => admin.from("notification_settings").delete().eq("user_id", userId), "notification_settings");
    await cleanup(() => admin.from("committee_requests").delete().eq("user_id", userId), "committee_requests");
    await cleanup(() => admin.from("deal_interests").delete().eq("user_id", userId), "deal_interests");
    await cleanup(() => admin.from("reviews").delete().eq("user_id", userId), "reviews");
    await cleanup(() => admin.from("complaints").delete().eq("user_id", userId), "complaints");
    await cleanup(() => admin.from("user_roles").delete().eq("user_id", userId), "user_roles");
    await cleanup(() => admin.from("profiles").delete().eq("id", userId), "profiles");

    // Best-effort: remove avatar files
    await cleanup(async () => {
      const { data } = await admin.storage.from("avatars").list(userId, { limit: 1000 });
      if (data && data.length > 0) {
        const paths = data.map((f) => `${userId}/${f.name}`);
        await admin.storage.from("avatars").remove(paths);
      }
    }, "avatars");

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) return json({ error: `auth delete: ${authErr.message}` }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error("[delete-account] error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
