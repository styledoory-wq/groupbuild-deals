// AI enhancement for a deal: generates marketing copy + enhanced background image.
// Stores results in deal_marketing_ai so the 4 templates can render fast.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "marketing-cards";
const GW = "https://ai.gateway.lovable.dev/v1";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  cover_image_url: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  join_deadline: string | null;
  target_participants: number | null;
};

async function generateCopy(deal: Deal, categoryName: string | null) {
  const sys = `אתה קופירייטר שיווקי מומחה לרכישה קבוצתית בישראל. כתוב טקסטים קצרים, חדים ומעוררי דחיפות בעברית. החזר JSON בלבד.`;
  const user = `הצעה לרכישה קבוצתית:
כותרת: ${deal.title}
${deal.description ? `תיאור: ${deal.description.slice(0, 400)}` : ""}
${categoryName ? `קטגוריה: ${categoryName}` : ""}
מחיר רגיל: ${deal.original_price ?? "—"}
מחיר קבוצתי: ${deal.discounted_price ?? "—"}
${deal.discount_percentage ? `הנחה: ${deal.discount_percentage}%` : ""}
${deal.target_participants ? `מטרת מצטרפים: ${deal.target_participants}` : ""}

החזר JSON עם השדות הבאים:
- "headline": כותרת שיווקית קצרה ומושכת (עד 6 מילים, בלי המחיר)
- "subheadline": משפט תועלת אחד (עד 12 מילים)
- "cta": קריאה לפעולה קצרה (עד 4 מילים, למשל "הצטרפו עכשיו")
- "urgencyTag": תג דחיפות קצר (2-3 מילים, למשל "נסגר היום")
- "recommendedTemplate": אחד מ: "premium-dark" | "whatsapp-viral" | "luxury-minimal" | "modern-green"`;

  const r = await fetch(`${GW}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`copy_${r.status}: ${await r.text()}`);
  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

async function enhanceImage(deal: Deal, categoryName: string | null): Promise<Uint8Array | null> {
  if (!deal.cover_image_url) return null;
  // Use Gemini image edit (Nano Banana) — feed original image + prompt for clean studio background.
  const prompt = `Professional studio product photography of "${deal.title}".
${categoryName ? `Category: ${categoryName}.` : ""}
Remove the original background. Place the product on a clean, modern, premium gradient background suitable for a high-end commercial ad. Soft studio lighting, subtle shadow, e-commerce hero quality. Square 1:1 composition, product centered, no text, no logos, no watermarks.`;

  const r = await fetch(`${GW}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: deal.cover_image_url } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    console.warn("image_enhance_failed", r.status, await r.text().catch(() => ""));
    return null;
  }
  const j = await r.json();
  // Gateway normalizes Gemini image responses into OpenAI-images shape (sometimes nested in choices.message.images)
  const msg = j.choices?.[0]?.message;
  const b64 =
    msg?.images?.[0]?.image_url?.url?.replace(/^data:image\/\w+;base64,/, "") ??
    j.data?.[0]?.b64_json ??
    null;
  if (!b64) {
    console.warn("image_enhance_no_b64", JSON.stringify(j).slice(0, 400));
    return null;
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

import { requireAuthUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAuthUser(req);
  if (!auth.ok) return auth.response;
  try {
    const { dealId, force } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from("deal_marketing_ai")
        .select("*")
        .eq("deal_id", dealId)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ ok: true, cached: true, data: cached }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .select("id,title,description,category_id,cover_image_url,original_price,discounted_price,discount_percentage,join_deadline,target_participants")
      .eq("id", dealId)
      .maybeSingle();
    if (error || !deal) {
      return new Response(JSON.stringify({ error: "deal_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let categoryName: string | null = null;
    if (deal.category_id) {
      const { data: cat } = await supabase.from("categories").select("name").eq("id", deal.category_id).maybeSingle();
      categoryName = cat?.name ?? null;
    }

    // Run text + image in parallel.
    const [copyRes, imgBytes] = await Promise.allSettled([
      generateCopy(deal as Deal, categoryName),
      enhanceImage(deal as Deal, categoryName),
    ]);

    const copy = copyRes.status === "fulfilled" ? copyRes.value : {};
    const imgBuf = imgBytes.status === "fulfilled" ? imgBytes.value : null;

    let enhancedUrl: string | null = null;
    if (imgBuf) {
      const path = `${dealId}/enhanced-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, imgBuf, {
        contentType: "image/png",
        upsert: true,
      });
      if (!upErr) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
        enhancedUrl = signed?.signedUrl ?? null;
      }
    }

    const row = {
      deal_id: dealId,
      headline: copy.headline ?? null,
      subheadline: copy.subheadline ?? null,
      cta: copy.cta ?? null,
      urgency_tag: copy.urgencyTag ?? null,
      recommended_template: copy.recommendedTemplate ?? "whatsapp-viral",
      enhanced_image_url: enhancedUrl,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: upsertErr } = await supabase
      .from("deal_marketing_ai")
      .upsert(row, { onConflict: "deal_id" })
      .select()
      .maybeSingle();
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true, cached: false, data: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ai-enhance-deal]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
