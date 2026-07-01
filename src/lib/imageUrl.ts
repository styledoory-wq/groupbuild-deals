/**
 * Supabase Storage image URL helpers.
 *
 * Rewrites public storage URLs to use the render/image transform endpoint so
 * that each surface receives an image sized for its actual display, delivered
 * as WebP when the browser supports it.
 *
 * Safe by default: if the URL doesn't match a Supabase storage path, or if the
 * transform fails at runtime, callers should keep the original URL as fallback
 * (see <SmartImg>).
 *
 * Presets:
 *   thumb   —  96px  (avatars in lists, tiny logos)
 *   logo    — 200px  (supplier logo card)
 *   card    — 480px  (deal cards in grids)
 *   detail  — 960px  (deal detail cover, gallery viewer)
 *   hero    — 1600px (landing hero, full-bleed)
 */

export type ImgSize = "thumb" | "logo" | "card" | "detail" | "hero";

const WIDTH: Record<ImgSize, number> = {
  thumb: 96,
  logo: 200,
  card: 480,
  detail: 960,
  hero: 1600,
};

const QUALITY: Record<ImgSize, number> = {
  thumb: 70,
  logo: 75,
  card: 75,
  detail: 80,
  hero: 82,
};

// Responsive width ladders per preset — used to build width-descriptor srcsets
// (`... 240w, ... 480w`) so browsers pick the closest match to the actual
// rendered size, guided by the `sizes` attribute.
const WIDTH_LADDER: Record<ImgSize, number[]> = {
  thumb: [64, 96, 192],
  logo: [120, 200, 400],
  card: [240, 480, 720, 960],
  detail: [480, 960, 1440],
  hero: [800, 1280, 1600, 1920],
};

// Match Supabase public storage object URLs:
//   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/?#]+)\/(.+?)(\?.*)?$/;

function buildRenderUrl(url: string, width: number, quality: number): string | null {
  if (!/^https?:\/\//i.test(url)) return null;
  if (url.includes("/storage/v1/render/image/")) return url;
  const m = url.match(PUBLIC_RE);
  if (!m) return null;
  const [, bucket, path] = m;
  const cleanPath = path.split("?")[0];
  const base = url.substring(0, url.indexOf("/storage/v1/"));
  return `${base}/storage/v1/render/image/public/${bucket}/${cleanPath}?width=${width}&quality=${quality}&resize=cover`;
}

/**
 * Rewrite a Supabase public storage URL to the render/image transform URL.
 * Returns the original URL unchanged when it isn't a Supabase public object
 * (e.g., data URLs, external CDN URLs, signed URLs, already-transformed URLs).
 */
export function imgUrl(url: string | null | undefined, size: ImgSize): string {
  if (!url) return "";
  const built = buildRenderUrl(url, WIDTH[size], QUALITY[size]);
  return built ?? url;
}

/**
 * Build a width-descriptor srcset ("url 240w, url 480w, ...") using the
 * preset's width ladder. Pair with the `sizes` attribute on the <img> so the
 * browser can pick the smallest sufficient variant.
 *
 * Falls back to a simple 1x/2x DPR srcset when width descriptors aren't
 * appropriate (single-scale surfaces like tiny thumbs).
 */
export function imgSrcSet(url: string | null | undefined, size: ImgSize): string | undefined {
  if (!url) return undefined;
  const q = QUALITY[size];
  const ladder = WIDTH_LADDER[size];
  const parts: string[] = [];
  for (const w of ladder) {
    const built = buildRenderUrl(url, w, q);
    if (!built) return undefined; // not transformable — bail
    parts.push(`${built} ${w}w`);
  }
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Tiny (24px, low quality) URL suitable for a blurred placeholder background.
 * Returns null when the URL isn't transformable (caller should skip blur).
 */
export function imgBlurUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return buildRenderUrl(url, 24, 30);
}
