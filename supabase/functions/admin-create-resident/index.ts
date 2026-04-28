// Admin-only edge function to create a new resident user without affecting the admin session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "חסר טוקן הזדהות" }, 401);
    }

    // Verify caller is an authenticated admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "לא מחובר" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "אין הרשאת אדמין" }, 403);
    }

    const body = await req.json();
    const { full_name, email, password, phone, city, project_id } = body ?? {};

    if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
      return json({ error: "מלאו שם, אימייל וסיסמה (לפחות 6 תווים)" }, 400);
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        phone: phone ?? "",
        city: city ?? "",
        user_type: "resident",
      },
    });

    if (createErr || !created.user) {
      return json({ error: createErr?.message || "יצירת משתמש נכשלה" }, 400);
    }

    // Ensure profile fields (trigger creates the row; update extras like project_id)
    const { error: upErr } = await admin
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        phone: phone ?? null,
        city: city ?? null,
        project_id: project_id || null,
        user_type: "resident",
      })
      .eq("id", created.user.id);

    if (upErr) {
      return json({ error: `הפרופיל לא עודכן: ${upErr.message}` }, 500);
    }

    return json({ success: true, user_id: created.user.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
