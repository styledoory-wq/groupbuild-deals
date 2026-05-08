import { supabase } from "@/integrations/supabase/client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Upload an image to the public `deal-images` bucket under {uid}/{filename}.
 * Returns the public URL. Used for both the cover image and gallery shots.
 */
export async function uploadDealImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק JPG / PNG / WEBP");
  if (file.size > MAX_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי להעלות תמונה");
  const path = `${uid}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from("deal-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("deal-images").getPublicUrl(path);
  return data.publicUrl;
}
