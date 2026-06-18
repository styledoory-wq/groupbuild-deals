import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, Plus, X, ShieldAlert, Sparkles, Lock } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DealImagesEditor } from "@/components/deals/DealImagesEditor";

/**
 * Supplier-restricted offer editor: only marketing fields.
 * Locked: deposit, tiers, pricing, conditions, status — to prevent abuse.
 */
export default function SupplierOfferMarketingEdit() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHl, setNewHl] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("title,description,highlights,cover_image_url,gallery_images")
        .eq("id", dealId)
        .maybeSingle();
      if (error) {
        toast.error("טעינה נכשלה");
        setLoading(false);
        return;
      }
      if (data) {
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setHighlights(Array.isArray(data.highlights) ? (data.highlights as string[]) : []);
        setCoverImage((data as { cover_image_url?: string | null }).cover_image_url ?? null);
        const g = (data as { gallery_images?: unknown }).gallery_images;
        setGalleryImages(Array.isArray(g) ? (g as string[]) : []);
      }
      setLoading(false);
    })();
  }, [dealId]);

  const addHighlight = () => {
    const v = newHl.trim();
    if (!v) return;
    if (highlights.length >= 8) {
      toast.error("עד 8 נקודות שיווקיות");
      return;
    }
    setHighlights((h) => [...h, v]);
    setNewHl("");
  };

  const handleSave = async () => {
    if (!dealId) return;
    if (!title.trim()) {
      toast.error("כותרת חובה");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("deals")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          highlights: highlights as never,
          cover_image_url: coverImage,
          gallery_images: galleryImages as never,
        })
        .eq("id", dealId);
      if (error) throw error;
      toast.success("השינויים נשמרו");
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <BackHeader title="עריכת הצעה" subtitle="טוען..." />
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <BackHeader title="עריכה שיווקית" subtitle="ניתן לעדכן רק שדות שיווקיים" />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
        {/* Trust banner */}
        <div className="rounded-[16px] bg-white border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] p-3.5 flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-[#0E6B5A]" />
          </div>
          <div className="text-fs-sm leading-relaxed">
            <div className="font-bold text-[#1F2937] mb-0.5">עריכה בטוחה</div>
            <p className="text-[#6B7280]">
              ניתן לעדכן את הטקסט השיווקי, הכותרת והתיאור — נתוני פיקדון, מדרגות ותנאים נעולים לשמירה על ההוגנות לדיירים.
            </p>
          </div>
        </div>


        {/* Editable */}
        <section className="gb-card p-4 space-y-3">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">כותרת ההצעה</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">תיאור / טקסט שיווקי</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1500}
              className="rounded-xl"
              placeholder="ספר על ההצעה — מה מיוחד בה, מה כלול..."
            />
          </div>
        </section>

        {/* Images */}
        <section className="gb-card p-4 space-y-3">
          <Label className="text-xs font-bold">תמונות ההצעה</Label>
          <DealImagesEditor
            cover={coverImage}
            gallery={galleryImages}
            onChange={({ cover, gallery }) => {
              setCoverImage(cover);
              setGalleryImages(gallery);
            }}
          />
        </section>

        {/* Highlights */}
        <section className="gb-card p-4 space-y-3">
          <Label className="text-xs font-bold">נקודות מפתח (Highlights)</Label>
          <div className="flex gap-2">
            <Input
              value={newHl}
              onChange={(e) => setNewHl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHighlight();
                }
              }}
              placeholder="לדוגמה: אחריות 5 שנים"
              maxLength={60}
              className="h-10 rounded-xl flex-1"
            />
            <Button type="button" onClick={addHighlight} className="h-10 rounded-xl px-3" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-fs-sm font-bold px-2.5 py-1.5 rounded-full bg-[#F4F6FA] text-[#1F2937] border border-[#ECEEF2]"
                >
                  {h}
                  <button
                    type="button"
                    onClick={() => setHighlights((arr) => arr.filter((_, idx) => idx !== i))}
                    className="h-4 w-4 rounded-full bg-white border border-[#ECEEF2] hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Locked fields */}
        <section className="rounded-[20px] border border-[#ECEEF2] bg-[#F4F6FA] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
            <Lock className="h-3.5 w-3.5" /> שדות נעולים לעריכה
          </div>
          <ul className="text-fs-sm text-[#6B7280] space-y-1 pr-5 list-disc">
            <li>סכום פיקדון ודרישת פיקדון</li>
            <li>מדרגות מחיר / הנחה</li>
            <li>סטטוס ההצעה ותנאי הצטרפות</li>
            <li>קטגוריה ונראות (ציבורי / פרויקט)</li>
          </ul>
          <p className="text-fs-xs text-[#6B7280] flex items-start gap-1.5 pt-1">
            <ShieldAlert className="h-3.5 w-3.5 text-[#0E6B5A] shrink-0 mt-0.5" />
            לשינויים בשדות אלו יש לפנות למנהל המערכת. נועד למניעת שינויים לאחר שדיירים כבר הצטרפו.
          </p>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pb-4 pt-3 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/95 to-transparent flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12 rounded-[16px]">
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-[16px] bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]">
            <Save className="h-4 w-4 ml-2" /> {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
