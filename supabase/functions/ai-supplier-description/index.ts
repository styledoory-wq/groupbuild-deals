// AI helper: writes/edits a short supplier description in Hebrew.
// Input: { businessName, categories?: string[], current?: string, mode?: "generate"|"improve" }
// Output: { text: string }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuthUser } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GW = "https://ai.gateway.lovable.dev/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAuthUser(req);
  if (!auth.ok) return auth.response;

  try {
    const { businessName, categories, current, mode } = await req.json();
    const catText = Array.isArray(categories) && categories.length ? categories.join(", ") : "";
    const isImprove = (mode === "improve") || (typeof current === "string" && current.trim().length >= 5);

    const sys = `אתה קופירייטר שיווקי מומחה בעברית, כותב לספקים בענף הבנייה והשיפוצים בישראל.
כתוב תיאור קצר, מקצועי, אנושי וחם, בגוף ראשון רבים ("אנחנו").
בלי אימוג'ים, בלי מרכאות, בלי סימני קריאה מיותרים, בלי מחירים או הבטחות שווא.
עד 350 תווים. משפט פתיחה חד שמסביר מה העסק מציע, ולאחריו 1-2 משפטים על ניסיון, איכות ושירות.
החזר טקסט חופשי בלבד — ללא JSON, ללא כותרות, ללא סוגריים.`;

    const user = isImprove
      ? `שם עסק: ${businessName || "—"}
תחומים: ${catText || "—"}
תיאור נוכחי של הספק:
"""${(current || "").slice(0, 800)}"""

שפר וערוך את התיאור: תקן שגיאות, שפר ניסוח, הפוך למקצועי ומזמין, שמור על המסר המקורי של הספק.`
      : `שם עסק: ${businessName || "—"}
תחומים: ${catText || "—"}

כתוב תיאור קצר חדש לכרטיס הספק, שיעזור לדיירים להבין למה לבחור בהם.`;

    const r = await fetch(`${GW}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`ai_${r.status}: ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    let text: string = j.choices?.[0]?.message?.content ?? "";
    text = text.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
    if (text.length > 400) text = text.slice(0, 400);

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ai-supplier-description]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
