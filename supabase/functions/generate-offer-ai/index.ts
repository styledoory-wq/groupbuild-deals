// Generate a draft offer from a supplier's short prompt.
// Returns JSON only. Never persists to DB. Never fills prices/deposits.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GW = "https://ai.gateway.lovable.dev/v1";

type CategoryLite = { id: string; name: string };

type DraftOffer = {
  title?: string;
  category_id?: string;
  description?: string;
  what_included?: string[];
  what_not_included?: string[];
  highlights?: string[];
  faq?: { q: string; a: string }[];
};

function buildSystem() {
  return `אתה עוזר AI שבונה טיוטת הצעה עבור ספק בפלטפורמת רכישה קבוצתית ישראלית (GroupBuild).
המטרה שלך: להפיק טיוטה מקצועית, קצרה ובעברית ברורה, על סמך תיאור קצר של הספק.

כללי ברזל — חובה:
- החזר JSON תקין בלבד, ללא טקסט מסביב.
- אל תמציא מידע. אם אתה לא בטוח בשדה — השאר אותו ריק או השמט אותו מה-JSON.
- לעולם אל תמלא מחירים, אחוזי הנחה, פיקדונות, הנחות, מספרי משתתפים או תאריכים.
- לעולם אל תזכיר אחריות (למשל "אחריות שנה") אלא אם הספק ציין אחריות במפורש בתיאור.
- לעולם אל תזכיר תקנים (למשל "תקן ישראלי", "ISO") אלא אם הספק ציין תקן במפורש.
- לעולם אל תזכיר זמני ביצוע/התקנה/אספקה אלא אם הספק ציין זמנים במפורש.
- אל תוסיף אימוג'ים בשדות הטקסט.
- description: פסקה קצרה של 1-3 משפטים בלבד. בלי סופרלטיבים ריקים ובלי חזרה על מה שיופיע ב-what_included.
- "מה כלול" / "מה לא כלול": פריטים קצרים (2-6 מילים), רק אם ברור מההקשר.
- highlights: 2-4 משפטים קצרים ומדויקים (עד 6 מילים כל אחד), רק עובדות שהספק ציין.
- faq: 2-4 שאלות רלוונטיות עם תשובות קצרות, רק אם התשובות נגזרות מהתיאור.`;
}

function buildUser(prompt: string, categories: CategoryLite[]) {
  const catList = categories.map((c) => `- ${c.id} :: ${c.name}`).join("\n");
  return `תיאור הספק:
"""
${prompt.slice(0, 2000)}
"""

רשימת קטגוריות זמינות (החזר את ה-id המדויק אם ברור, אחרת אל תחזיר category_id):
${catList}

החזר JSON באובייקט אחד עם השדות (כולם אופציונליים — השמט מה שלא ברור):
{
  "title": "כותרת קצרה וברורה להצעה",
  "category_id": "id מדויק מהרשימה למעלה",
  "description": "תיאור מקצועי של 2-4 משפטים",
  "what_included": ["פריט 1", "פריט 2"],
  "what_not_included": ["פריט שאינו כלול"],
  "highlights": ["יתרון קצר", "יתרון קצר"],
  "faq": [{"q": "שאלה?", "a": "תשובה קצרה"}]
}`;
}

function pickCategoryId(raw: unknown, categories: CategoryLite[]): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return categories.find((c) => c.id === raw) ? raw : undefined;
}

function normalize(data: Record<string, unknown>, categories: CategoryLite[]): DraftOffer {
  const draft: DraftOffer = {};
  if (typeof data.title === "string" && data.title.trim()) draft.title = data.title.trim().slice(0, 120);
  const cid = pickCategoryId(data.category_id, categories);
  if (cid) draft.category_id = cid;
  if (typeof data.description === "string" && data.description.trim()) draft.description = data.description.trim().slice(0, 1500);
  const strArr = (v: unknown): string[] => Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim().slice(0, 120)).slice(0, 8)
    : [];
  const inc = strArr(data.what_included);
  const notInc = strArr(data.what_not_included);
  const hl = strArr(data.highlights);
  if (inc.length) draft.what_included = inc;
  if (notInc.length) draft.what_not_included = notInc;
  if (hl.length) draft.highlights = hl;
  if (Array.isArray(data.faq)) {
    const faq = data.faq
      .map((row) => {
        const r = row as { q?: unknown; a?: unknown };
        if (typeof r.q !== "string" || typeof r.a !== "string") return null;
        const q = r.q.trim().slice(0, 160);
        const a = r.a.trim().slice(0, 400);
        return q && a ? { q, a } : null;
      })
      .filter((x): x is { q: string; a: string } => !!x)
      .slice(0, 6);
    if (faq.length) draft.faq = faq;
  }
  return draft;
}

import { requireAuthUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  const auth = await requireAuthUser(req);
  if (!auth.ok) return auth.response;

  try {
    if (!LOVABLE_API_KEY) throw new Error("missing_LOVABLE_API_KEY");
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const categories: CategoryLite[] = Array.isArray(body.categories)
      ? (body.categories as unknown[])
          .map((c) => c as { id?: unknown; name?: unknown })
          .filter((c) => typeof c.id === "string" && typeof c.name === "string")
          .map((c) => ({ id: c.id as string, name: c.name as string }))
          .slice(0, 60)
      : [];
    if (prompt.length < 3) {
      return new Response(JSON.stringify({ error: "prompt_too_short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch(`${GW}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystem() },
          { role: "user", content: buildUser(prompt, categories) },
        ],
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t.slice(0, 400) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const draft = normalize(parsed, categories);

    return new Response(JSON.stringify({ ok: true, draft }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
