/**
 * Client-side image resize + compress + WebP conversion using Canvas.
 * Falls back to original file if browser can't decode (e.g., HEIC on old Safari).
 *
 * Presets tuned for GroupBuild image roles:
 *   - logo:    400px, quality 0.85 → ~15-30KB
 *   - avatar:  400px, quality 0.85 → ~15-30KB
 *   - card:    800px, quality 0.80 → ~40-80KB
 *   - gallery: 1200px, quality 0.82 → ~80-160KB
 *   - hero:    1600px, quality 0.82 → ~150-250KB
 *
 * All presets output WebP when supported (all modern browsers + iOS 14+).
 */

export type ImagePreset = "logo" | "avatar" | "card" | "gallery" | "hero";

const PRESETS: Record<ImagePreset, { maxSide: number; quality: number }> = {
  logo: { maxSide: 400, quality: 0.85 },
  avatar: { maxSide: 400, quality: 0.85 },
  card: { maxSide: 800, quality: 0.8 },
  gallery: { maxSide: 1200, quality: 0.82 },
  hero: { maxSide: 1600, quality: 0.82 },
};

let webpSupport: boolean | null = null;
function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

/**
 * Preset-based resize + compress. Preferred entry point.
 */
export async function resizeToPreset(file: File, preset: ImagePreset): Promise<File> {
  const { maxSide, quality } = PRESETS[preset];
  return resizeImage(file, maxSide, quality);
}

/**
 * Low-level resize. Kept for backwards compatibility. Converts to WebP when
 * the browser supports it, otherwise JPEG.
 */
export async function resizeImage(file: File, maxSide = 800, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // SVG can't be rasterized safely and is already small.
  if (file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const useWebp = supportsWebP();
    const mime = useWebp ? "image/webp" : "image/jpeg";
    const ext = useWebp ? ".webp" : ".jpg";

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), mime, quality),
    );
    if (!blob) return file;

    // If encoded file is larger than original (rare for tiny images), keep original.
    if (blob.size >= file.size && file.type === mime) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") + ext;
    return new File([blob], baseName, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}
