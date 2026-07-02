import { useState } from "react";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
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
  /** Whether the card starts expanded. Defaults to false (collapsed). */
  defaultOpen?: boolean;
}

/**
 * Compact AI generator card — collapsed by default so it doesn't dominate step 1.
 * Uses the same neutral tokens as the rest of the editor (no heavy gradient).
 */
export function AiOfferGeneratorCard({ categories, onDraftReady, disabled, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
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
      toast.success("נוצרה טיוטה. השלם מחירים ופרסם.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירת טיוטה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#ECEEF2] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-right hover:bg-[#F8F9FB] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-[#0E6B5A]/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-[#0E6B5A]" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#1F2937] leading-tight">יצירה מהירה עם AI</div>
            <div className="text-[11px] text-[#6B7280] leading-tight mt-0.5 truncate">
              תאר בכמה מילים ונבנה עבורך טיוטת הצעה
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#6B7280] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[#ECEEF2] p-3 space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="לדוגמה: התקנת מזגן עילי 2.5 כ״ס כולל חומרים ואחריות שנתיים"
            className="min-h-[90px] max-h-[110px] rounded-lg text-[13px] p-3"
            disabled={loading}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] text-[#9CA3AF] leading-tight">
              ה-AI לא ממלא מחירים, פיקדונות או תאריכים.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={generate}
              disabled={loading || disabled}
              className="h-9 rounded-lg bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white text-[12px] font-bold px-4 shrink-0"
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" /> יוצר…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 ml-1.5" /> צור טיוטה</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
