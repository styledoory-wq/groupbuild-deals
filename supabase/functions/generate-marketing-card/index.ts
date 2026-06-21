// AI Marketing Generator — Modern Green template, renders 3 formats and uploads to storage.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import QRCode from "npm:qrcode@1.5.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "marketing-cards";
const PUBLIC_SITE = "https://groupbuild.co.il";

// Resvg WASM init (cold start)
let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasm = await fetch(
        "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
      ).then((r) => r.arrayBuffer());
      await initWasm(wasm);
    })();
  }
  return wasmReady;
}

// Hebrew fonts (Heebo) — fetched once
let fontsCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
async function loadFonts() {
  if (fontsCache) return fontsCache;
  const [reg, bold] = await Promise.all([
    fetch("https://github.com/google/fonts/raw/main/ofl/heebo/static/Heebo-Regular.ttf").then(r => r.arrayBuffer()),
    fetch("https://github.com/google/fonts/raw/main/ofl/heebo/static/Heebo-Black.ttf").then(r => r.arrayBuffer()),
  ]);
  fontsCache = { regular: reg, bold };
  return fontsCache;
}

async function imageToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch { return null; }
}

type Deal = {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  original_price?: number | null;
  discounted_price?: number | null;
  discount_percentage?: number | null;
  ends_at?: string | null;
  join_deadline?: string | null;
};

type Format = { key: "square" | "story" | "banner"; w: number; h: number };
const FORMATS: Format[] = [
  { key: "square", w: 1080, h: 1080 },
  { key: "story", w: 1080, h: 1920 },
  { key: "banner", w: 1200, h: 628 },
];

const GREEN = "#0E6B5A";
const GREEN_2 = "#34A88E";
const CREAM = "#F7F5F0";
const INK = "#0B1220";
const MUTED = "#6B7280";

function buildTree(deal: Deal, fmt: Format, coverDataUrl: string | null, qrDataUrl: string, dealUrl: string) {
  const original = deal.original_price ?? null;
  const price = deal.discounted_price ?? null;
  const pct = deal.discount_percentage ??
    (original && price ? Math.round(((original - price) / original) * 100) : null);
  const isStory = fmt.key === "story";
  const isBanner = fmt.key === "banner";

  const pad = isBanner ? 40 : 56;
  const titleSize = isStory ? 76 : isBanner ? 52 : 64;
  const priceSize = isStory ? 110 : isBanner ? 72 : 96;

  const imgH = isStory ? 820 : isBanner ? 320 : 460;

  return {
    type: "div",
    props: {
      style: {
        width: fmt.w, height: fmt.h, display: "flex", flexDirection: "column",
        background: `linear-gradient(160deg, ${CREAM} 0%, #FFFFFF 60%, ${CREAM} 100%)`,
        padding: pad, position: "relative", fontFamily: "Heebo",
      },
      children: [
        // Header (brand)
        {
          type: "div", props: {
            style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: pad / 2 },
            children: [
              {
                type: "div", props: {
                  style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 14 },
                  children: [
                    { type: "div", props: { style: { width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_2} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 28 }, children: "GB" } },
                    { type: "div", props: { style: { color: INK, fontSize: 30, fontWeight: 900 }, children: "GroupBuild" } },
                  ],
                },
              },
              pct ? { type: "div", props: { style: { background: GREEN, color: "#fff", padding: "10px 22px", borderRadius: 999, fontSize: 36, fontWeight: 900 }, children: `-${pct}%` } } : { type: "div", props: { children: "" } },
            ],
          },
        },
        // Cover image
        coverDataUrl ? {
          type: "div", props: {
            style: { width: "100%", height: imgH, borderRadius: 28, overflow: "hidden", display: "flex", marginBottom: 28, border: `2px solid ${GREEN}` },
            children: [
              { type: "img", props: { src: coverDataUrl, width: fmt.w - pad * 2, height: imgH, style: { width: "100%", height: "100%", objectFit: "cover" } } },
            ],
          },
        } : { type: "div", props: { style: { width: "100%", height: imgH, borderRadius: 28, background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_2} 100%)`, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 96 }, children: "GroupBuild" } },

        // Title
        { type: "div", props: { style: { color: INK, fontSize: titleSize, fontWeight: 900, lineHeight: 1.1, textAlign: "right", direction: "rtl", marginBottom: 16 }, children: deal.title } },

        // Tag line
        { type: "div", props: { style: { color: MUTED, fontSize: isBanner ? 22 : 28, textAlign: "right", direction: "rtl", marginBottom: 28 }, children: "ככל שיותר מצטרפים — המחיר יורד" } },

        // Prices row
        {
          type: "div", props: {
            style: { display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", gap: 28, marginBottom: 24 },
            children: [
              price != null ? { type: "div", props: { style: { color: GREEN, fontSize: priceSize, fontWeight: 900, lineHeight: 1 }, children: `₪${price.toLocaleString("he-IL")}` } } : { type: "div", props: { children: "" } },
              original != null ? { type: "div", props: { style: { color: MUTED, fontSize: priceSize * 0.45, textDecoration: "line-through", paddingBottom: 12 }, children: `₪${original.toLocaleString("he-IL")}` } } : { type: "div", props: { children: "" } },
            ],
          },
        },

        // Footer: CTA + QR
        {
          type: "div", props: {
            style: { marginTop: "auto", display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 24 },
            children: [
              { type: "div", props: { style: { background: GREEN, color: "#fff", padding: "22px 40px", borderRadius: 20, fontSize: isBanner ? 28 : 36, fontWeight: 900, display: "flex" }, children: "להצטרפות לחצו כאן ←" } },
              { type: "div", props: { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
                children: [
                  { type: "img", props: { src: qrDataUrl, width: isBanner ? 110 : 150, height: isBanner ? 110 : 150 } },
                  { type: "div", props: { style: { fontSize: 16, color: MUTED }, children: "סרקו לפרטים" } },
                ],
              } },
            ],
          },
        },
      ],
    },
  };
}

async function renderPng(deal: Deal, fmt: Format, coverDataUrl: string | null, qrDataUrl: string, dealUrl: string, fonts: { regular: ArrayBuffer; bold: ArrayBuffer }) {
  const tree = buildTree(deal, fmt, coverDataUrl, qrDataUrl, dealUrl);
  const svg = await satori(tree as never, {
    width: fmt.w,
    height: fmt.h,
    fonts: [
      { name: "Heebo", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Heebo", data: fonts.bold, weight: 900, style: "normal" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: fmt.w } });
  return resvg.render().asPng();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { dealId } = await req.json();
    if (!dealId) return new Response(JSON.stringify({ error: "dealId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: deal, error } = await supabase
      .from("deals")
      .select("id,title,description,cover_image_url,original_price,discounted_price,discount_percentage,ends_at,join_deadline")
      .eq("id", dealId)
      .maybeSingle();
    if (error || !deal) return new Response(JSON.stringify({ error: "deal_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await ensureWasm();
    const fonts = await loadFonts();

    const dealUrl = `${PUBLIC_SITE}/share/deal/${deal.id}`;
    const [coverDataUrl, qrDataUrl] = await Promise.all([
      imageToDataUrl(deal.cover_image_url ?? null),
      QRCode.toDataURL(dealUrl, { margin: 1, width: 256, color: { dark: "#0B1220", light: "#FFFFFF" } }),
    ]);

    const urls: Record<string, string> = {};
    for (const fmt of FORMATS) {
      const png = await renderPng(deal as Deal, fmt, coverDataUrl, qrDataUrl, dealUrl, fonts);
      const path = `${deal.id}/${fmt.key}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, png, {
        contentType: "image/png", upsert: true,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      urls[fmt.key] = signed?.signedUrl ?? "";
    }

    return new Response(JSON.stringify({ ok: true, dealUrl, urls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-marketing-card]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
