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

// Match Supabase public storage object URLs:
//   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/?#]+)\/(.+?)(\?.*)?$/;

/**
 * Rewrite a Supabase public storage URL to the render/image transform URL.
 * Returns the original URL unchanged when it isn't a Supabase public object
 * (e.g., data URLs, external CDN URLs, signed URLs, already-transformed URLs).
 */
export function imgUrl(url: string | null | undefined, size: ImgSize): string {
  if (!url) return "";
  // Data URLs / blob URLs / non-http — never rewrite.
  if (!/^https?:\/\//i.test(url)) return url;
  // Already a render URL — don't double-transform.
  if (url.includes("/storage/v1/render/image/")) return url;

  const m = url.match(PUBLIC_RE);
  if (!m) return url;

  const [, bucket, path] = m;
  // Strip existing query string; we add our own.
  const cleanPath = path.split("?")[0];
  const base = url.substring(0, url.indexOf("/storage/v1/"));
  const w = WIDTH[size];
  const q = QUALITY[size];
  return `${base}/storage/v1/render/image/public/${bucket}/${cleanPath}?width=${w}&quality=${q}&resize=cover`;
}

/**
 * Build a srcset string for retina displays. Uses 1x/2x widths.
 */
export function imgSrcSet(url: string | null | undefined, size: ImgSize): string | undefined {
  if (!url) return undefined;
  const base = imgUrl(url, size);
  if (base === url) return undefined; // not transformable
  // Build a 2x variant by bumping width. Cap at hero width.
  const nextSize: Record<ImgSize, ImgSize> = {
    thumb: "logo",
    logo: "card",
    card: "detail",
    detail: "hero",
    hero: "hero",
  };
  const retina = imgUrl(url, nextSize[size]);
  if (retina === base) return undefined;
  return `${base} 1x, ${retina} 2x`;
}
