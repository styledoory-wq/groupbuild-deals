import { supabase } from "@/integrations/supabase/client";
import { resizeToPreset } from "@/lib/imageResize";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // Accept up to 10MB from user, we compress before upload

// 1 year, immutable — filenames are timestamped so they never collide.
const CACHE_CONTROL = "31536000";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Upload a deal image (used for cover + gallery).
 * Resized to "gallery" preset (1200px WebP) — same file drives both card
 * (via CDN transform to 480px) and detail (via 960px). One asset, many sizes.
 */
export async function uploadDealImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק JPG / PNG / WEBP");
  if (file.size > MAX_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 10MB)");
  const resized = await resizeToPreset(file, "gallery");
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי להעלות תמונה");
  const path = `${uid}/${Date.now()}_${safeName(resized.name)}`;
  const { error } = await supabase.storage.from("deal-images").upload(path, resized, {
    cacheControl: CACHE_CONTROL,
    upsert: false,
    contentType: resized.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("deal-images").getPublicUrl(path);
  return data.publicUrl;
}
