import { useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDealImage } from "@/lib/dealUploads";
import { toast } from "sonner";
import { SmartImg } from "@/components/ui/SmartImg";
import { supabase } from "@/integrations/supabase/client";

async function enhanceCover(sourceUrl: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("enhance-uploaded-image", {
      body: { sourceUrl },
    });
    if (error) throw error;
    const url = (data as { url?: string } | null)?.url;
    return url ?? sourceUrl;
  } catch (e) {
    console.warn("[enhanceCover] falling back to original", e);
    return sourceUrl;
  }
}

type Props = {
  cover: string | null;
  gallery: string[];
  onChange: (next: { cover: string | null; gallery: string[] }) => void;
  maxGallery?: number;
};

/**
 * Reusable cover + gallery editor for deals.
 * Uploads to the `deal-images` bucket and propagates URLs upward.
 */
export function DealImagesEditor({ cover, gallery, onChange, maxGallery = 6 }: Props) {
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [enhancing, setEnhancing] = useState(false);

  const pickCover = async (f: File | null) => {
    if (!f) return;
    setUploading("cover");
    try {
      const url = await uploadDealImage(f);
      onChange({ cover: url, gallery });
      setUploading(null);
      // Auto-enhance the uploaded image (does NOT replace the product).
      setEnhancing(true);
      const enhanced = await enhanceCover(url);
      if (enhanced !== url) {
        onChange({ cover: enhanced, gallery });
        toast.success("התמונה שופרה אוטומטית ✨");
      } else {
        toast.success("התמונה הועלתה");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "העלאה נכשלה");
    } finally {
      setUploading(null);
      setEnhancing(false);
      if (coverInput.current) coverInput.current.value = "";
    }
  };

  const pickGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, maxGallery - gallery.length);
    if (remaining === 0) {
      toast.error(`ניתן להעלות עד ${maxGallery} תמונות בלבד`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`ניתן להעלות עד ${maxGallery} תמונות בלבד`);
    }
    setUploading("gallery");
    try {
      const list = Array.from(files).slice(0, remaining);
      const urls: string[] = [];
      for (const f of list) {
        const u = await uploadDealImage(f);
        urls.push(u);
      }
      // Smart auto-cover: if there's no cover yet, promote the first uploaded image and enhance it.
      const hadCover = !!cover;
      const promoted = hadCover ? null : urls[0] ?? null;
      const nextCover = cover ?? promoted;
      const nextGallery = hadCover ? [...gallery, ...urls] : [...gallery, ...urls.slice(1)];
      onChange({ cover: nextCover, gallery: nextGallery });
      setUploading(null);
      if (promoted) {
        setEnhancing(true);
        const enhanced = await enhanceCover(promoted);
        if (enhanced !== promoted) {
          onChange({ cover: enhanced, gallery: nextGallery });
          toast.success("תמונת שער שופרה אוטומטית ✨");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "העלאה נכשלה");
    } finally {
      setUploading(null);
      setEnhancing(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const removeGallery = (idx: number) =>
    onChange({ cover, gallery: gallery.filter((_, i) => i !== idx) });

  const promoteToCover = async (idx: number) => {
    const promoted = gallery[idx];
    const rest = gallery.filter((_, i) => i !== idx);
    const newGallery = cover ? [cover, ...rest] : rest;
    onChange({ cover: promoted, gallery: newGallery });
    setEnhancing(true);
    try {
      const enhanced = await enhanceCover(promoted);
      if (enhanced !== promoted) {
        onChange({ cover: enhanced, gallery: newGallery });
        toast.success("תמונת שער שופרה אוטומטית ✨");
      }
    } finally {
      setEnhancing(false);
    }
  };

  const enhanceCurrentCover = async () => {
    if (!cover) return;
    setEnhancing(true);
    try {
      const enhanced = await enhanceCover(cover);
      if (enhanced !== cover) {
        onChange({ cover: enhanced, gallery });
        toast.success("התמונה שופרה ✨");
      } else {
        toast.info("לא ניתן היה לשפר כעת");
      }
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cover */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-fs-sm font-bold text-foreground">
            תמונת שער <span className="text-muted-foreground font-normal">(לא חובה)</span>
          </h4>
          <span className="text-fs-xs text-muted-foreground">JPG / PNG · עד 10MB</span>
        </div>
        {cover ? (
          <div className="space-y-2">
            <div className="relative rounded-2xl overflow-hidden border border-gold/30 group">
              <SmartImg src={cover} size="card" alt="cover" className="w-full h-44 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-fs-xs font-bold px-2 py-1 rounded-full bg-gold text-primary shadow">
                <Star className="h-3 w-3" /> שער ראשי
              </span>
              <button
                type="button"
                onClick={() => onChange({ cover: null, gallery })}
                disabled={enhancing}
                className="absolute top-2 left-2 h-8 w-8 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                aria-label="הסר תמונת שער"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {enhancing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                  <div className="text-fs-xs font-bold">משפר את התמונה…</div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={enhanceCurrentCover}
              disabled={enhancing}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-gold/10 text-fs-xs font-bold text-foreground hover:bg-gold/20 transition-smooth disabled:opacity-60"
            >
              <Wand2 className="h-3.5 w-3.5 text-gold" />
              שפר תמונה שוב (Smart Crop + איכות)
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            disabled={uploading === "cover"}
            className="w-full h-44 rounded-2xl border-2 border-dashed border-gold/40 bg-gradient-to-br from-gold/5 to-transparent flex flex-col items-center justify-center gap-2 hover:border-gold/70 transition-smooth disabled:opacity-60"
          >
            {uploading === "cover" ? (
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <ImagePlus className="h-6 w-6 text-gold" />
                </div>
                <div className="text-fs-sm font-bold text-foreground">העלאת תמונת שער</div>
                <div className="text-fs-xs text-muted-foreground text-center px-4 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-gold" />
                  שיפור אוטומטי לאחר העלאה — חיתוך חכם, איכות, תאורה וצבעים
                </div>
              </>
            )}
          </button>
        )}
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
        />
      </div>


      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-fs-sm font-bold text-foreground">
            גלריה <span className="text-muted-foreground font-normal">({gallery.length}/{maxGallery})</span>
          </h4>
          <span className="text-fs-xs text-muted-foreground">לפני / אחרי · עבודות · מוצרים</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((url, i) => (
            <div key={url + i} className="relative group rounded-xl overflow-hidden border border-border aspect-square">
              <SmartImg src={url} size="thumb" alt={`g-${i}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                type="button"
                onClick={() => promoteToCover(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-card/90 border border-border flex items-center justify-center text-gold opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="הפוך לשער"
                title="הפוך לתמונת שער"
              >
                <Star className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => removeGallery(i)}
                className="absolute top-1 left-1 h-6 w-6 rounded-full bg-card/90 border border-border flex items-center justify-center text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="הסר תמונה"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {gallery.length < maxGallery && (
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              disabled={uploading === "gallery"}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-gold/50 bg-muted/30 flex flex-col items-center justify-center gap-1 transition-smooth disabled:opacity-60"
            >
              {uploading === "gallery" ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5 text-gold" />
                  <span className="text-fs-xs font-bold text-muted-foreground">הוסף</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={galleryInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickGallery(e.target.files)}
        />
      </div>
    </div>
  );
}
