// Marketing card renderer. Supports 4 templates × 3 formats, one render per invocation.
// Uses cached AI copy + enhanced image from deal_marketing_ai when available.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import QRCode from "npm:qrcode@1.5.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "marketing-cards";
const PUBLIC_SITE = "https://groupbuild.co.il";

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasm = await fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm").then((r) => r.arrayBuffer());
      await initWasm(wasm);
    })();
  }
  return wasmReady;
}

let fontsCache: { rHe: ArrayBuffer; bHe: ArrayBuffer; rLa: ArrayBuffer; bLa: ArrayBuffer } | null = null;
async function loadFonts() {
  if (fontsCache) return fontsCache;
  const base = "https://cdn.jsdelivr.net/npm/@fontsource/heebo@5.0.5/files";
  const [rHe, bHe, rLa, bLa] = await Promise.all([
    fetch(`${base}/heebo-hebrew-400-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/heebo-hebrew-900-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/heebo-latin-400-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/heebo-latin-900-normal.woff`).then((r) => r.arrayBuffer()),
  ]);
  fontsCache = { rHe, bHe, rLa, bLa };
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
  } catch {
    return null;
  }
}

type Deal = {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  original_price?: number | null;
  discounted_price?: number | null;
  discount_percentage?: number | null;
  join_deadline?: string | null;
};

type AiData = {
  headline: string | null;
  subheadline: string | null;
  cta: string | null;
  urgency_tag: string | null;
  enhanced_image_url: string | null;
} | null;

type FormatKey = "square" | "story" | "banner";
type Format = { key: FormatKey; w: number; h: number };
const FORMATS: Record<FormatKey, Format> = {
  square: { key: "square", w: 1080, h: 1080 },
  story: { key: "story", w: 1080, h: 1920 },
  banner: { key: "banner", w: 1200, h: 628 },
};

type TemplateKey = "premium-dark" | "whatsapp-viral" | "luxury-minimal" | "modern-green";

// Satori has no BiDi engine. Reverse word order, reverse Hebrew tokens.
function rtl(s: string): string {
  if (!s) return s;
  const hebrewRe = /[\u0590-\u05FF]/;
  const tokens = s.split(/(\s+)/);
  const out = tokens.map((t) => {
    if (/^\s+$/.test(t)) return t;
    if (hebrewRe.test(t)) return t.split("").reverse().join("");
    return t;
  });
  return out.reverse().join("");
}

function price(n: number | null | undefined) {
  if (n == null) return "";
  return `₪${n.toLocaleString("he-IL")}`;
}

type Ctx = {
  deal: Deal;
  ai: AiData;
  fmt: Format;
  cover: string | null; // data URL
  qr: string;
  headline: string;
  sub: string;
  cta: string;
  urgency: string;
  pct: number | null;
};

// ============ TEMPLATE 1: Premium Dark ============
function premiumDark(c: Ctx) {
  const { fmt, cover, qr, headline, cta, urgency, pct, deal } = c;
  const pad = fmt.key === "banner" ? 36 : 56;
  const priceSize = fmt.key === "story" ? 200 : fmt.key === "banner" ? 110 : 170;
  return {
    type: "div",
    props: {
      style: {
        width: fmt.w, height: fmt.h, position: "relative", display: "flex", flexDirection: "column",
        background: "#0B0B0E", fontFamily: "Heebo", color: "#fff", overflow: "hidden",
      },
      children: [
        // Cover full-bleed top
        cover ? {
          type: "img", props: {
            src: cover, width: fmt.w, height: fmt.h,
            style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 },
          },
        } : { type: "div", props: { style: { position: "absolute", inset: 0, background: "linear-gradient(135deg,#1a1a2e,#16213e)" } } },
        // Vignette
        { type: "div", props: { style: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)" } } },
        // Top bar
        { type: "div", props: {
          style: { position: "absolute", top: pad, left: pad, right: pad, display: "flex", alignItems: "center", justifyContent: "space-between" },
          children: [
            { type: "div", props: {
              style: { display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 999 },
              children: [
                { type: "div", props: { style: { width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#D4AF37,#FFD86B)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0B0B0E", fontWeight: 900, fontSize: 16 }, children: "G" } },
                { type: "div", props: { style: { fontSize: 18, fontWeight: 800, letterSpacing: 1 }, children: "GROUPBUILD" } },
              ],
            } },
            pct ? { type: "div", props: { style: { background: "linear-gradient(135deg,#D4AF37,#B8860B)", color: "#0B0B0E", padding: "10px 22px", borderRadius: 12, fontSize: 28, fontWeight: 900, display: "flex" }, children: `-${pct}%` } } : { type: "div", props: { children: "" } },
          ],
        } },
        // Bottom content
        { type: "div", props: {
          style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: `0 ${pad}px ${pad}px`, display: "flex", flexDirection: "column" },
          children: [
            urgency ? { type: "div", props: { style: { alignSelf: "flex-end", background: "#D4AF37", color: "#0B0B0E", padding: "6px 16px", borderRadius: 6, fontSize: 18, fontWeight: 800, marginBottom: 14, display: "flex" }, children: rtl(urgency) } } : { type: "div", props: { children: "" } },
            { type: "div", props: { style: { fontSize: fmt.key === "banner" ? 44 : 60, fontWeight: 900, lineHeight: 1.05, marginBottom: 20, textAlign: "right", display: "flex", textShadow: "0 4px 24px rgba(0,0,0,0.6)" }, children: rtl(headline) } },
            { type: "div", props: { style: { display: "flex", flexDirection: "row-reverse", alignItems: "baseline", gap: 20, marginBottom: 24 },
              children: [
                { type: "div", props: { style: { color: "#D4AF37", fontSize: priceSize, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4, display: "flex" }, children: price(deal.discounted_price) } },
                deal.original_price ? { type: "div", props: { style: { color: "rgba(255,255,255,0.5)", fontSize: priceSize * 0.28, textDecoration: "line-through", display: "flex" }, children: price(deal.original_price) } } : { type: "div", props: { children: "" } },
              ],
            } },
            { type: "div", props: {
              style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 14 },
              children: [
                { type: "div", props: { style: { flex: 1, background: "linear-gradient(135deg,#D4AF37,#B8860B)", color: "#0B0B0E", padding: "20px 32px", borderRadius: 16, fontSize: 30, fontWeight: 900, textAlign: "center", display: "flex", justifyContent: "center" }, children: rtl(cta) } },
                { type: "div", props: { style: { width: 88, height: 88, background: "#fff", padding: 6, borderRadius: 12, display: "flex" }, children: [{ type: "img", props: { src: qr, width: 76, height: 76 } }] } },
              ],
            } },
          ],
        } },
      ],
    },
  };
}

// ============ TEMPLATE 2: WhatsApp Viral ============
function whatsappViral(c: Ctx) {
  const { fmt, cover, qr, headline, cta, urgency, pct, deal } = c;
  const pad = fmt.key === "banner" ? 36 : 48;
  const priceSize = fmt.key === "story" ? 240 : fmt.key === "banner" ? 130 : 200;
  return {
    type: "div",
    props: {
      style: { width: fmt.w, height: fmt.h, position: "relative", display: "flex", flexDirection: "column", background: "#000", fontFamily: "Heebo", color: "#fff", overflow: "hidden" },
      children: [
        cover ? { type: "img", props: { src: cover, width: fmt.w, height: fmt.h, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } } } : { type: "div", props: { style: { position: "absolute", inset: 0, background: "linear-gradient(135deg,#0E6B5A,#25D366)" } } },
        // gradients
        { type: "div", props: { style: { position: "absolute", top: 0, left: 0, right: 0, height: 240, background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))" } } },
        { type: "div", props: { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: fmt.h * 0.6, background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.92))" } } },
        // top bar
        { type: "div", props: {
          style: { position: "absolute", top: pad, left: pad, right: pad, display: "flex", alignItems: "center", justifyContent: "space-between" },
          children: [
            { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", padding: "8px 16px", borderRadius: 999 }, children: [
              { type: "div", props: { style: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#25D366,#0E6B5A)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }, children: "G" } },
              { type: "div", props: { style: { fontSize: 18, fontWeight: 800 }, children: "GroupBuild" } },
            ] } },
            urgency ? { type: "div", props: { style: { background: "#FF3B30", color: "#fff", padding: "8px 16px", borderRadius: 999, fontSize: 16, fontWeight: 800, display: "flex" }, children: rtl(urgency) } } : { type: "div", props: { children: "" } },
          ],
        } },
        // discount medallion
        pct ? { type: "div", props: {
          style: { position: "absolute", top: 130, left: 40, width: 170, height: 170, borderRadius: 9999, background: "radial-gradient(circle at 30% 30%, #FFE066, #FFC93C 55%, #E59A00)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1a1a1a", border: "3px solid rgba(255,255,255,0.55)", transform: "rotate(-8deg)" },
          children: [
            { type: "div", props: { style: { fontSize: 22, fontWeight: 800, lineHeight: 1, display: "flex" }, children: rtl("חיסכון") } },
            { type: "div", props: { style: { fontSize: 64, fontWeight: 900, letterSpacing: -3, lineHeight: 1, display: "flex" }, children: `${pct}%` } },
          ],
        } } : { type: "div", props: { children: "" } },
        // bottom content
        { type: "div", props: {
          style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: `0 ${pad}px ${pad}px`, display: "flex", flexDirection: "column" },
          children: [
            { type: "div", props: { style: { fontSize: fmt.key === "banner" ? 38 : 56, fontWeight: 900, lineHeight: 1.05, marginBottom: 20, textAlign: "right", display: "flex", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }, children: rtl(headline) } },
            { type: "div", props: {
              style: { display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", gap: 18, marginBottom: 24 },
              children: [
                { type: "div", props: { style: { display: "flex", flexDirection: "column", alignItems: "flex-end" }, children: [
                  { type: "div", props: { style: { fontSize: 18, fontWeight: 700, color: "#FFC93C", letterSpacing: 1.5, display: "flex" }, children: rtl("מחיר קבוצתי") } },
                  { type: "div", props: { style: { fontSize: priceSize, fontWeight: 900, color: "#fff", lineHeight: 0.9, letterSpacing: -8, display: "flex", textShadow: "0 6px 30px rgba(0,0,0,0.6)" }, children: price(deal.discounted_price) } },
                ] } },
                deal.original_price ? { type: "div", props: { style: { display: "flex", flexDirection: "column", paddingBottom: 24, alignItems: "flex-end" }, children: [
                  { type: "div", props: { style: { fontSize: 14, opacity: 0.6, display: "flex" }, children: rtl("במקום") } },
                  { type: "div", props: { style: { fontSize: 26, color: "rgba(255,255,255,0.55)", textDecoration: "line-through", display: "flex" }, children: price(deal.original_price) } },
                ] } } : { type: "div", props: { children: "" } },
              ],
            } },
            { type: "div", props: {
              style: { display: "flex", flexDirection: "row-reverse", alignItems: "stretch", gap: 14 },
              children: [
                { type: "div", props: { style: { flex: 1, background: "linear-gradient(135deg,#25D366,#128C7E)", padding: "20px 26px", borderRadius: 20, display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 16, color: "#fff", fontSize: 28, fontWeight: 900 }, children: rtl(cta) } },
                { type: "div", props: { style: { width: 96, background: "#fff", padding: 8, borderRadius: 16, display: "flex" }, children: [{ type: "img", props: { src: qr, width: 80, height: 80 } }] } },
              ],
            } },
          ],
        } },
      ],
    },
  };
}

// ============ TEMPLATE 3: Luxury Minimal ============
function luxuryMinimal(c: Ctx) {
  const { fmt, cover, qr, headline, sub, cta, pct, deal } = c;
  const pad = fmt.key === "banner" ? 40 : 64;
  const isStory = fmt.key === "story";
  return {
    type: "div",
    props: {
      style: { width: fmt.w, height: fmt.h, display: "flex", flexDirection: "column", background: "#F8F6F1", fontFamily: "Heebo", color: "#1a1a1a", padding: pad, position: "relative" },
      children: [
        // Header
        { type: "div", props: {
          style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: pad / 2 },
          children: [
            { type: "div", props: { style: { fontSize: 20, fontWeight: 900, letterSpacing: 6, color: "#1a1a1a", display: "flex" }, children: "GROUPBUILD" } },
            pct ? { type: "div", props: { style: { fontSize: 16, fontWeight: 700, letterSpacing: 4, color: "#8B6F3C", display: "flex" }, children: `-${pct}% OFF` } } : { type: "div", props: { children: "" } },
          ],
        } },
        // Image
        { type: "div", props: {
          style: { width: "100%", height: isStory ? 900 : fmt.key === "banner" ? 280 : 540, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: pad / 1.5, overflow: "hidden", border: "1px solid #E8E4DA" },
          children: [
            cover ? { type: "img", props: { src: cover, width: fmt.w - pad * 2, height: isStory ? 900 : fmt.key === "banner" ? 280 : 540, style: { width: "100%", height: "100%", objectFit: "cover" } } } : { type: "div", props: { style: { color: "#bbb", fontSize: 80, fontWeight: 900, display: "flex" }, children: "G" } },
          ],
        } },
        // Headline
        { type: "div", props: { style: { fontSize: fmt.key === "banner" ? 36 : 54, fontWeight: 900, lineHeight: 1.1, textAlign: "right", marginBottom: 12, color: "#1a1a1a", display: "flex" }, children: rtl(headline) } },
        // Subhead
        { type: "div", props: { style: { fontSize: 22, color: "#6b6b6b", textAlign: "right", marginBottom: 28, display: "flex" }, children: rtl(sub) } },
        // Footer
        { type: "div", props: {
          style: { marginTop: "auto", display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", borderTop: "1px solid #E8E4DA", paddingTop: 24 },
          children: [
            { type: "div", props: { style: { display: "flex", flexDirection: "column", alignItems: "flex-end" }, children: [
              { type: "div", props: { style: { fontSize: 14, letterSpacing: 3, color: "#8B6F3C", marginBottom: 6, display: "flex" }, children: rtl("מחיר קבוצתי") } },
              { type: "div", props: { style: { display: "flex", flexDirection: "row-reverse", alignItems: "baseline", gap: 14 }, children: [
                { type: "div", props: { style: { fontSize: fmt.key === "banner" ? 80 : 120, fontWeight: 900, color: "#1a1a1a", letterSpacing: -4, lineHeight: 0.9, display: "flex" }, children: price(deal.discounted_price) } },
                deal.original_price ? { type: "div", props: { style: { fontSize: 24, color: "#9a9a9a", textDecoration: "line-through", display: "flex" }, children: price(deal.original_price) } } : { type: "div", props: { children: "" } },
              ] } },
            ] } },
            { type: "div", props: { style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 16 }, children: [
              { type: "div", props: { style: { background: "#1a1a1a", color: "#F8F6F1", padding: "18px 28px", fontSize: 22, fontWeight: 800, letterSpacing: 2, display: "flex" }, children: rtl(cta) } },
              { type: "div", props: { style: { width: 84, background: "#fff", padding: 6, border: "1px solid #E8E4DA", display: "flex" }, children: [{ type: "img", props: { src: qr, width: 72, height: 72 } }] } },
            ] } },
          ],
        } },
      ],
    },
  };
}

// ============ TEMPLATE 4: Modern Green ============
function modernGreen(c: Ctx) {
  const { fmt, cover, qr, headline, sub, cta, pct, deal } = c;
  const pad = fmt.key === "banner" ? 36 : 56;
  const isStory = fmt.key === "story";
  return {
    type: "div",
    props: {
      style: { width: fmt.w, height: fmt.h, display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#F7F5F0 0%,#FFFFFF 60%,#F7F5F0 100%)", padding: pad, position: "relative", fontFamily: "Heebo" },
      children: [
        // Header
        { type: "div", props: {
          style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: pad / 2 },
          children: [
            { type: "div", props: { style: { display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 12 }, children: [
              { type: "div", props: { style: { width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg,#0E6B5A,#34A88E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 24 }, children: "GB" } },
              { type: "div", props: { style: { color: "#0B1220", fontSize: 26, fontWeight: 900, display: "flex" }, children: "GroupBuild" } },
            ] } },
            pct ? { type: "div", props: { style: { background: "#0E6B5A", color: "#fff", padding: "8px 20px", borderRadius: 999, fontSize: 30, fontWeight: 900, display: "flex" }, children: `-${pct}%` } } : { type: "div", props: { children: "" } },
          ],
        } },
        // Cover
        { type: "div", props: {
          style: { width: "100%", height: isStory ? 820 : fmt.key === "banner" ? 280 : 460, borderRadius: 24, overflow: "hidden", marginBottom: 24, border: "2px solid #0E6B5A", display: "flex" },
          children: cover ? [{ type: "img", props: { src: cover, width: fmt.w - pad * 2, height: isStory ? 820 : fmt.key === "banner" ? 280 : 460, style: { width: "100%", height: "100%", objectFit: "cover" } } }]
            : [{ type: "div", props: { style: { width: "100%", height: "100%", background: "linear-gradient(135deg,#0E6B5A,#34A88E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 80 }, children: "GroupBuild" } }],
        } },
        // Headline
        { type: "div", props: { style: { color: "#0B1220", fontSize: fmt.key === "banner" ? 44 : 58, fontWeight: 900, lineHeight: 1.1, textAlign: "right", marginBottom: 12, display: "flex" }, children: rtl(headline) } },
        { type: "div", props: { style: { color: "#6B7280", fontSize: 24, textAlign: "right", marginBottom: 20, display: "flex" }, children: rtl(sub) } },
        // Prices
        { type: "div", props: {
          style: { display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", gap: 24, marginBottom: 20 },
          children: [
            { type: "div", props: { style: { color: "#0E6B5A", fontSize: fmt.key === "banner" ? 80 : 110, fontWeight: 900, lineHeight: 1, display: "flex" }, children: price(deal.discounted_price) } },
            deal.original_price ? { type: "div", props: { style: { color: "#6B7280", fontSize: 36, textDecoration: "line-through", paddingBottom: 14, display: "flex" }, children: price(deal.original_price) } } : { type: "div", props: { children: "" } },
          ],
        } },
        // Footer
        { type: "div", props: {
          style: { marginTop: "auto", display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 20 },
          children: [
            { type: "div", props: { style: { background: "#0E6B5A", color: "#fff", padding: "20px 36px", borderRadius: 18, fontSize: 30, fontWeight: 900, display: "flex" }, children: rtl(cta) } },
            { type: "div", props: { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }, children: [
              { type: "img", props: { src: qr, width: 130, height: 130 } },
              { type: "div", props: { style: { fontSize: 14, color: "#6B7280", display: "flex" }, children: rtl("סרקו לפרטים") } },
            ] } },
          ],
        } },
      ],
    },
  };
}

function buildTree(template: TemplateKey, c: Ctx) {
  switch (template) {
    case "premium-dark": return premiumDark(c);
    case "whatsapp-viral": return whatsappViral(c);
    case "luxury-minimal": return luxuryMinimal(c);
    case "modern-green":
    default: return modernGreen(c);
  }
}

async function renderPng(tree: unknown, fmt: Format, fonts: { rHe: ArrayBuffer; bHe: ArrayBuffer; rLa: ArrayBuffer; bLa: ArrayBuffer }) {
  const svg = await satori(tree as never, {
    width: fmt.w,
    height: fmt.h,
    fonts: [
      { name: "Heebo", data: fonts.rLa, weight: 400, style: "normal" },
      { name: "Heebo", data: fonts.bLa, weight: 900, style: "normal" },
      { name: "Heebo", data: fonts.rHe, weight: 400, style: "normal", lang: "he-IL" },
      { name: "Heebo", data: fonts.bHe, weight: 900, style: "normal", lang: "he-IL" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: fmt.w } });
  return resvg.render().asPng();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const dealId: string = body.dealId;
    const format: FormatKey = (body.format as FormatKey) ?? "square";
    const template: TemplateKey = (body.template as TemplateKey) ?? "modern-green";
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fmt = FORMATS[format] ?? FORMATS.square;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: deal, error } = await supabase
      .from("deals")
      .select("id,title,description,cover_image_url,original_price,discounted_price,discount_percentage,join_deadline")
      .eq("id", dealId)
      .maybeSingle();
    if (error || !deal) {
      return new Response(JSON.stringify({ error: "deal_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ai } = await supabase
      .from("deal_marketing_ai")
      .select("headline,subheadline,cta,urgency_tag,enhanced_image_url")
      .eq("deal_id", dealId)
      .maybeSingle();

    await ensureWasm();
    const fonts = await loadFonts();

    const dealUrl = `${PUBLIC_SITE}/share/deal/${deal.id}`;
    const imgUrl = ai?.enhanced_image_url || deal.cover_image_url || null;
    const [coverDataUrl, qrDataUrl] = await Promise.all([
      imageToDataUrl(imgUrl),
      QRCode.toDataURL(dealUrl, { margin: 1, width: 256, color: { dark: "#0B1220", light: "#FFFFFF" } }),
    ]);

    const pct = deal.discount_percentage ??
      (deal.original_price && deal.discounted_price ? Math.round(((deal.original_price - deal.discounted_price) / deal.original_price) * 100) : null);

    const ctx: Ctx = {
      deal: deal as Deal,
      ai: (ai ?? null) as AiData,
      fmt,
      cover: coverDataUrl,
      qr: qrDataUrl,
      headline: (ai?.headline || deal.title || "").trim(),
      sub: (ai?.subheadline || "ככל שיותר מצטרפים — המחיר יורד").trim(),
      cta: (ai?.cta || "להצטרפות").trim(),
      urgency: (ai?.urgency_tag || "").trim(),
      pct,
    };

    const tree = buildTree(template, ctx);
    const png = await renderPng(tree, fmt, fonts);

    const path = `${deal.id}/${template}-${fmt.key}-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);

    return new Response(JSON.stringify({ ok: true, dealUrl, template, format: fmt.key, url: signed?.signedUrl ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-marketing-card]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
