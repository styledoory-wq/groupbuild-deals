import { useState } from "react";
import { Sparkles, Loader2, Mic, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AiOfferDraft = {
  title?: string;
  category_id?: string;
  description?: string;
  what_included?: string[];
  what_not_included?: string[];
  highlights?: string[];
  faq?: { q: string; a: string }[];
};

type CategoryLite = { id: string; name: string };

interface Props {
  categories: CategoryLite[];
  onDraftReady: (draft: AiOfferDraft) => void;
  disabled?: boolean;
}

export function AiOfferGeneratorCard({ categories, onDraftReady, disabled }: Props) {
  const [open, setOpen] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const clean = prompt.trim();
    if (clean.length < 3) {
      toast.error("כתוב לפחות כמה מילים על ההצעה");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-offer-ai", {
        body: { prompt: clean, categories },
      });
      if (error) throw error;
      const draft = (data as { ok?: boolean; draft?: AiOfferDraft; error?: string })?.draft ?? {};
      const errCode = (data as { error?: string })?.error;
      if (errCode === "credits_exhausted") {
        toast.error("נגמרו קרדיטים ל-AI. נסה שוב מאוחר יותר.");
        return;
      }
      if (errCode === "rate_limited") {
        toast.error("יותר מדי בקשות ל-AI. נסה שוב בעוד רגע.");
        return;
      }
      onDraftReady(draft);
      toast.success("יצרנו עבורך טיוטת הצעה. השלם את המחירים ופרסם.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירת טיוטה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full rounded-2xl border border-dashed border-[#0E6B5A]/40 bg-[#0E6B5A]/5 px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-[#0E6B5A] hover:bg-[#0E6B5A]/10 transition"
      >
        <Sparkles className="h-4 w-4" /> צור טיוטה חדשה עם AI
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[#0E6B5A]/20 bg-gradient-to-br from-[#0E6B5A] to-[#34A88E] text-white shadow-lg">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-extrabold">צור הצעה עם AI</div>
              <div className="text-[11px] opacity-90">חסוך זמן — קבל טיוטה מוכנה תוך שניות</div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[12px] leading-relaxed opacity-95">
          תאר בכמה מילים מה אתה מציע, ואנחנו נבנה עבורך טיוטת הצעה. תוכל לערוך הכל אחר כך.
        </p>

        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="לדוגמה: התקנת מזגן עילי 2.5 כוח סוס כולל חומרים ואחריות שנתיים…"
            className="min-h-[110px] rounded-xl bg-white text-[#1F2937] placeholder:text-[#9CA3AF] pr-4"
            disabled={loading}
          />
          <button
            type="button"
            title="הכתבה קולית (בקרוב)"
            disabled
            className="absolute bottom-2 left-2 h-8 w-8 rounded-lg bg-[#F4F6FA] text-[#9CA3AF] flex items-center justify-center opacity-70 cursor-not-allowed"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <Button
          type="button"
          onClick={generate}
          disabled={loading || disabled}
          className="w-full h-11 rounded-xl bg-white text-[#0E6B5A] hover:bg-white/90 font-extrabold"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> AI בונה עבורך הצעה…</>
          ) : (
            <><Sparkles className="h-4 w-4 ml-2" /> בנה לי הצעה</>
          )}
        </Button>
        <p className="text-[10px] opacity-80 text-center">
          ה-AI לא ממלא מחירים, פיקדונות או תאריכים — רק תוכן. אתה משלים ומאשר.
        </p>
      </div>
    </div>
  );
}
