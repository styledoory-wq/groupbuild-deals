import { supabase } from "@/integrations/supabase/client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPES = ["application/pdf"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadTo(bucket: string, file: File): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי להעלות קבצים");
  const path = `${uid}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSupplierLogo(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק תמונות JPG / PNG / WEBP");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
  return uploadTo("supplier-logos", file);
}

export async function uploadSupplierGalleryImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("רק תמונות JPG / PNG / WEBP");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
  return uploadTo("supplier-gallery", file);
}

export async function uploadSupplierCatalog(file: File): Promise<string> {
  if (!PDF_TYPES.includes(file.type)) throw new Error("רק קובץ PDF");
  if (file.size > MAX_PDF_BYTES) throw new Error("הקובץ גדול מדי (מקסימום 15MB)");
  return uploadTo("supplier-catalogs", file);
}
