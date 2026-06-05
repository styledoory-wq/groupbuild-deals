// Sends transactional emails via Resend.
// Single endpoint, server-side recipient resolution (clients pass IDs, not emails).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "GroupBuild <onboarding@resend.dev>";
const BRAND_NAVY = "#0E2A47";
const BRAND_GOLD = "#C9A24B";

type NotificationEmailSettings = Record<string, boolean | null | undefined> & {
  email_notifications_enabled?: boolean | null;
};

type Payload =
  | { type: "supplier_approved"; supplier_id: string }
  | { type: "resident_approved"; user_id: string }
  | { type: "new_lead"; interest_id: string }
  | { type: "deposit_confirmed"; user_id: string; amount?: number; deal_title?: string }
  | { type: "new_offer"; user_id: string; deal_title: string; supplier_name?: string }
  | { type: "voucher_created"; user_id: string; voucher_code: string; deal_title?: string }
  | { type: "deal_status_changed"; user_id: string; deal_title: string; status: string }
  | { type: "welcome"; user_id: string }
  | { type: "admin_notification"; subject: string; message: string }
  | { type: "test"; to: string };

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrap(title: string, bodyHtml: string, ctaUrl?: string, ctaText?: string) {
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;direction:rtl">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:${BRAND_NAVY};border-radius:14px 14px 0 0;padding:18px 22px;text-align:center">
      <div style="color:${BRAND_GOLD};font-size:22px;font-weight:bold;letter-spacing:0.5px">GroupBuild</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 14px 14px;padding:26px 24px;box-shadow:0 4px 14px rgba(0,0,0,0.06)">
      <h1 style="margin:0 0 14px;color:${BRAND_NAVY};font-size:20px">${title}</h1>
      <div style="font-size:15px;line-height:1.7;color:#333">${bodyHtml}</div>
      ${ctaUrl && ctaText ? `<div style="margin-top:24px;text-align:center"><a href="${ctaUrl}" style="background:${BRAND_GOLD};color:${BRAND_NAVY};text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:10px;display:inline-block">${ctaText}</a></div>` : ""}
      <p style="margin-top:28px;color:#888;font-size:12px;text-align:center">הודעה אוטומטית ממערכת GroupBuild · groupbuild.co.il</p>
    </div>
  </div>
</body></html>`;
}

async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  console.log("[send-email] RESEND_API_KEY exists:", !!key);
  console.log("[send-email] from:", FROM, "to:", to, "subject:", subject);
  if (!key) throw new Error("RESEND_API_KEY חסר בהגדרות השרת");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const text = await res.text();
  console.log("[send-email] Resend status:", res.status, "body:", text);
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.message || j.error || text;
    } catch { /* keep raw */ }
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (p: unknown, s = 200) =>
    new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ success: false, error: "unauthorized" }, 200);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ success: false, error: "unauthorized" }, 200);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = (await req.json()) as Payload;

    const isAdmin = await admin
      .from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin")
      .maybeSingle().then((r) => !!r.data);

    type PrefKind = "approval" | "lead" | "deposit" | "new_offer" | "voucher" | "deal_status" | "system" | "welcome";
    const PREF_COL: Record<PrefKind, string> = {
      approval: "approval_email_enabled",
      lead: "new_lead_email_enabled",
      deposit: "deposit_email_enabled",
      new_offer: "new_offer_email_enabled",
      voucher: "voucher_email_enabled",
      deal_status: "deal_status_email_enabled",
      system: "system_email_enabled",
      welcome: "welcome_email_enabled",
    };
    async function prefAllows(userId: string | null, kind: PrefKind): Promise<boolean> {
      if (!userId) return true;
      const col = PREF_COL[kind];
      const { data } = await admin
        .from("notification_settings")
        .select(`email_notifications_enabled, ${col}`)
        .eq("user_id", userId).maybeSingle();
      if (!data) return true;
      const d = data as NotificationEmailSettings;
      if (!d.email_notifications_enabled) return false;
      return d[col] !== false;
    }

    async function getUserEmail(userId: string): Promise<{ email: string | null; name: string }> {
      const { data: prof } = await admin.from("profiles")
        .select("email, full_name").eq("id", userId).maybeSingle();
      return { email: prof?.email ?? null, name: prof?.full_name ?? "" };
    }

    if (body.type === "supplier_approved") {
      if (!isAdmin) return json({ success: false, error: "forbidden" }, 200);
      const { data: sup } = await admin.from("suppliers")
        .select("email, business_name, user_id").eq("id", body.supplier_id).maybeSingle();
      if (!sup?.email) return json({ success: false, error: "לספק אין כתובת מייל" }, 200);
      if (!(await prefAllows(sup.user_id, "approval"))) return json({ success: true, skipped: "user_pref" });
      const html = wrap("החשבון שלך אושר 🎉",
        `<p>שלום ${escapeHtml(sup.business_name)},</p><p>החשבון שלך במערכת <b>GroupBuild</b> אושר ופעיל.</p>`,
        "https://groupbuild.co.il/auth", "כניסה למערכת");
      await sendResend(sup.email, "החשבון שלך אושר במערכת GroupBuild", html);
      return json({ success: true });
    }

    if (body.type === "resident_approved") {
      if (!isAdmin) return json({ success: false, error: "forbidden" }, 200);
      const { data: prof } = await admin.from("profiles")
        .select("email, full_name").eq("id", body.user_id).maybeSingle();
      if (!prof?.email) return json({ success: false, error: "למשתמש אין כתובת מייל" }, 200);
      if (!(await prefAllows(body.user_id, "approval"))) return json({ success: true, skipped: "user_pref" });
      const html = wrap("החשבון שלך אושר 🎉",
        `<p>שלום ${escapeHtml(prof.full_name)},</p><p>החשבון שלך במערכת <b>GroupBuild</b> אושר ומוכן לשימוש.</p>`,
        "https://groupbuild.co.il/auth", "כניסה למערכת");
      await sendResend(prof.email, "החשבון שלך אושר במערכת GroupBuild", html);
      return json({ success: true });
    }

    if (body.type === "new_lead") {
      if (!body.interest_id) return json({ success: false, error: "missing_interest_id" }, 200);

      const { data: interest } = await admin.from("deal_interests")
        .select("id,user_id,deal_id,full_name,phone,city,project_name,estimated_quantity,is_deleted")
        .eq("id", body.interest_id)
        .maybeSingle();
      if (!interest || interest.is_deleted) return json({ success: false, error: "lead_not_found" }, 200);

      const { data: deal } = await admin.from("deals")
        .select("id,title,supplier_id")
        .eq("id", interest.deal_id)
        .maybeSingle();
      if (!deal?.supplier_id) return json({ success: false, error: "deal_not_found" }, 200);

      const { data: sup } = await admin.from("suppliers")
        .select("email, business_name, user_id").eq("id", deal.supplier_id).maybeSingle();
      if (!sup?.email) return json({ success: false, error: "לספק אין כתובת מייל" }, 200);

      const callerOwnsLead = interest.user_id === u.user.id;
      const callerOwnsSupplier = sup.user_id === u.user.id;
      if (!isAdmin && !callerOwnsLead && !callerOwnsSupplier) {
        return json({ success: false, error: "forbidden" }, 200);
      }

      if (!(await prefAllows(sup.user_id, "lead"))) return json({ success: true, skipped: "user_pref" });
      const details = [
        interest.full_name && `שם: ${escapeHtml(interest.full_name)}`,
        interest.phone && `טלפון: ${escapeHtml(interest.phone)}`,
        interest.city && `עיר: ${escapeHtml(interest.city)}`,
        interest.project_name && `פרויקט: ${escapeHtml(interest.project_name)}`,
      ].filter(Boolean).join("<br>");
      const html = wrap("ליד חדש בהצעה שלך",
        `<p>שלום ${escapeHtml(sup.business_name)},</p><p>דייר חדש הביע עניין בהצעה: <b>${escapeHtml(deal.title)}</b></p>
         ${details ? `<div style="background:#F5F1EA;padding:14px;border-radius:10px;margin-top:10px">${details}</div>` : ""}`,
        "https://groupbuild.co.il/supplier/leads", "צפייה בליד");
      await sendResend(sup.email, `ליד חדש: ${deal.title ?? "הצעה שלך"}`, html);
      return json({ success: true });
    }

    if (body.type === "test") {
      if (!isAdmin) return json({ success: false, error: "forbidden" }, 200);
      const html = wrap("בדיקת מערכת מיילים ✅",
        `<p>שלום,</p><p>זהו מייל בדיקה ממערכת <b>GroupBuild</b>.</p>
         <p>אם הגיע אליך – שליחת המיילים דרך Resend פעילה ותקינה.</p>`,
        "https://groupbuild.co.il", "לאתר");
      await sendResend(body.to, "בדיקת מיילים — GroupBuild", html);
      return json({ success: true });
    }

    if (body.type === "deposit_confirmed") {
      if (!isAdmin && body.user_id !== u.user.id) return json({ success: false, error: "forbidden" });
      const { email, name } = await getUserEmail(body.user_id);
      if (!email) return json({ success: false, error: "no_email" });
      if (!(await prefAllows(body.user_id, "deposit"))) return json({ success: true, skipped: "user_pref" });
      const detail = body.deal_title ? ` עבור <b>${escapeHtml(body.deal_title)}</b>` : "";
      const amount = body.amount ? ` בסך ${escapeHtml(body.amount)} ₪` : "";
      const html = wrap("הפיקדון שלך אושר ✅",
        `<p>שלום ${escapeHtml(name)},</p><p>הפיקדון שלך${amount}${detail} התקבל בהצלחה.</p>`,
        "https://groupbuild.co.il/resident/my-deposits", "צפייה בפיקדונות שלי");
      await sendResend(email, "אישור פיקדון — GroupBuild", html);
      return json({ success: true });
    }

    if (body.type === "new_offer") {
      const { email, name } = await getUserEmail(body.user_id);
      if (!email) return json({ success: false, error: "no_email" });
      if (!(await prefAllows(body.user_id, "new_offer"))) return json({ success: true, skipped: "user_pref" });
      const supplier = body.supplier_name ? ` מאת ${escapeHtml(body.supplier_name)}` : "";
      const html = wrap("הצעה חדשה זמינה",
        `<p>שלום ${escapeHtml(name)},</p><p>הצעה חדשה הופקה${supplier}: <b>${escapeHtml(body.deal_title)}</b></p>`,
        "https://groupbuild.co.il/resident/deals", "צפייה בהצעה");
      await sendResend(email, `הצעה חדשה: ${body.deal_title}`, html);
      return json({ success: true });
    }

    if (body.type === "voucher_created") {
      if (!isAdmin && body.user_id !== u.user.id) return json({ success: false, error: "forbidden" });
      const { email, name } = await getUserEmail(body.user_id);
      if (!email) return json({ success: false, error: "no_email" });
      if (!(await prefAllows(body.user_id, "voucher"))) return json({ success: true, skipped: "user_pref" });
      const dealLine = body.deal_title ? `<p>עבור: <b>${escapeHtml(body.deal_title)}</b></p>` : "";
      const html = wrap("השובר שלך מוכן 🎟️",
        `<p>שלום ${escapeHtml(name)},</p>${dealLine}<p>קוד שובר: <b style="font-size:18px">${escapeHtml(body.voucher_code)}</b></p>`,
        "https://groupbuild.co.il/resident/my-vouchers", "צפייה בשוברים שלי");
      await sendResend(email, "שובר חדש זמין במערכת", html);
      return json({ success: true });
    }

    if (body.type === "deal_status_changed") {
      const { email, name } = await getUserEmail(body.user_id);
      if (!email) return json({ success: false, error: "no_email" });
      if (!(await prefAllows(body.user_id, "deal_status"))) return json({ success: true, skipped: "user_pref" });
      const html = wrap("עדכון סטטוס עסקה",
        `<p>שלום ${escapeHtml(name)},</p><p>סטטוס העסקה <b>${escapeHtml(body.deal_title)}</b> השתנה ל-<b>${escapeHtml(body.status)}</b>.</p>`,
        "https://groupbuild.co.il/resident/deals", "צפייה בעסקה");
      await sendResend(email, `עדכון: ${body.deal_title}`, html);
      return json({ success: true });
    }

    if (body.type === "welcome") {
      const { email, name } = await getUserEmail(body.user_id);
      if (!email) return json({ success: false, error: "no_email" });
      if (!(await prefAllows(body.user_id, "welcome"))) return json({ success: true, skipped: "user_pref" });
      const html = wrap("ברוכים הבאים ל-GroupBuild 👋",
        `<p>שלום ${escapeHtml(name)},</p><p>שמחים שהצטרפת! במערכת תוכל לראות הצעות מותאמות, להזמין שוברים ולעקוב אחרי הפעילות שלך.</p>`,
        "https://groupbuild.co.il", "התחלה");
      await sendResend(email, "ברוכים הבאים ל-GroupBuild", html);
      return json({ success: true });
    }

    if (body.type === "admin_notification") {
      if (!isAdmin) return json({ success: false, error: "forbidden" });
      const { data: settings } = await admin
        .from("admin_settings").select("notification_email").limit(1).maybeSingle();
      const to = settings?.notification_email;
      if (!to) return json({ success: false, error: "no_admin_email" });
      const html = wrap(body.subject, `<p>${escapeHtml(body.message)}</p>`);
      await sendResend(to, body.subject, html);
      return json({ success: true });
    }

    return json({ success: false, error: "unknown_type" }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[send-email] error", msg);
    return json({ success: false, error: msg }, 200);
  }
});
