import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/imageResize";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Upload an image to the public `deal-images` bucket under {uid}/{filename}.
 * Resizes to max 800px (longest side) and compresses to JPEG 0.82 before upload.
 */
export async function uploadDealImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק JPG / PNG / WEBP");
  if (file.size > MAX_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
  const resized = await resizeImage(file, 800, 0.82);
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי להעלות תמונה");
  const path = `${uid}/${Date.now()}_${safeName(resized.name)}`;
  const { error } = await supabase.storage.from("deal-images").upload(path, resized, {
    cacheControl: "3600",
    upsert: false,
    contentType: resized.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("deal-images").getPublicUrl(path);
  return data.publicUrl;
}
