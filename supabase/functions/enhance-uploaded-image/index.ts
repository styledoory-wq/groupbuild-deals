// Enhance a supplier-uploaded image (does NOT replace the product).
// - Smart Crop to square (subject centered)
// - Upscale / denoise / color & lighting correction / perspective straighten
// Uses Gemini image-edit (Nano Banana) with a strict "keep the product identical" prompt.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GW = "https://ai.gateway.lovable.dev/v1";
const BUCKET = "deal-images";

const PROMPT = `Enhance this real product photo for a premium e-commerce cover.
STRICT RULES:
- Do NOT invent, replace, redraw, or restyle the product. Keep the same object, brand, text, materials, colors and shape 1:1.
- Do NOT add or remove any items, people, logos, watermarks, or text.
Enhancements only:
- Smart crop to a clean 1:1 square with the main subject centered.
- Gentle upscale and denoise (remove sensor noise, JPEG artefacts, motion blur).
- Correct exposure, white balance and contrast for natural true-to-life colors.
- Balance harsh shadows and blown highlights; soften but keep realistic lighting.
- Straighten mild perspective / rotation so the subject looks upright.
- Keep the background as-is; if it is very cluttered, only lightly clean small distractions — do not replace it.
Output: photorealistic, faithful to the original, sharp, print-quality.`;

async function fetchAsDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch_source_${r.status}`);
  const ct = r.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${ct};base64,${btoa(bin)}`;
}

async function enhance(sourceUrl: string): Promise<Uint8Array | null> {
  const dataUrl = await fetchAsDataUrl(sourceUrl);
  const r = await fetch(`${GW}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    console.warn("enhance_failed", r.status, await r.text().catch(() => ""));
    return null;
  }
  const j = await r.json();
  const msg = j.choices?.[0]?.message;
  const b64 =
    msg?.images?.[0]?.image_url?.url?.replace(/^data:image\/\w+;base64,/, "") ??
    j.data?.[0]?.b64_json ??
    null;
  if (!b64) {
    console.warn("enhance_no_b64", JSON.stringify(j).slice(0, 400));
    return null;
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Auth: uploader must be signed in.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anon.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sourceUrl } = await req.json();
    if (!sourceUrl || typeof sourceUrl !== "string") {
      return new Response(JSON.stringify({ error: "sourceUrl_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF guard — only allow public Supabase Storage URLs from this project.
    // Prevents fetching cloud metadata IPs or internal services.
    const allowedPrefix = `${SUPABASE_URL}/storage/v1/object/public/`;
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_source_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "https:" || !sourceUrl.startsWith(allowedPrefix)) {
      return new Response(JSON.stringify({ error: "source_url_not_allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const enhanced = await enhance(sourceUrl);
    if (!enhanced) {
      // Fallback: return the original so the flow never blocks.
      return new Response(JSON.stringify({ ok: true, enhanced: false, url: sourceUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const path = `${uid}/enhanced-${Date.now()}.png`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, enhanced, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "31536000",
    });
    if (upErr) throw upErr;
    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

    return new Response(JSON.stringify({ ok: true, enhanced: true, url: data.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[enhance-uploaded-image]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
