import { supabase } from "@/integrations/supabase/client";
import { resizeToPreset, type ImagePreset } from "@/lib/imageResize";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPES = ["application/pdf"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — compressed client-side before upload
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB

// 1 year, immutable — filenames are timestamped so they never collide.
const CACHE_CONTROL = "31536000";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadTo(bucket: string, file: File): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי להעלות קבצים");
  const path = `${uid}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: CACHE_CONTROL,
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadImageWithPreset(
  bucket: string,
  file: File,
  preset: ImagePreset,
): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק תמונות JPG / PNG / WEBP");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 10MB)");
  const resized = await resizeToPreset(file, preset);
  return uploadTo(bucket, resized);
}

export async function uploadSupplierLogo(file: File): Promise<string> {
  return uploadImageWithPreset("supplier-logos", file, "logo");
}

export async function uploadSupplierGalleryImage(file: File): Promise<string> {
  return uploadImageWithPreset("supplier-gallery", file, "gallery");
}

export async function uploadSupplierCatalog(file: File): Promise<string> {
  if (!PDF_TYPES.includes(file.type)) throw new Error("רק קובץ PDF");
  if (file.size > MAX_PDF_BYTES) throw new Error("הקובץ גדול מדי (מקסימום 15MB)");
  return uploadTo("supplier-catalogs", file);
}
