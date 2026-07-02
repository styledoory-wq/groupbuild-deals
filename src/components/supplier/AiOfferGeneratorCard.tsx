import { useState } from "react";
import { Sparkles, Loader2, X, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

/**
 * Minimal AI helper. Default: single compact row. Expanded: simple input + generate.
 * After success: collapses to a subtle success line with "פתח שוב".
 */
export function AiOfferGeneratorCard({ categories, onDraftReady, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

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
      toast.success("נוצרה טיוטה");
      setLastGenerated(draft.title || clean.slice(0, 40));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירת טיוטה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  // Success state — subtle line with reopen
  if (lastGenerated && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-[#0E6B5A]/[0.04] hover:bg-[#0E6B5A]/[0.07] transition-colors text-right"
      >
        <div className="h-6 w-6 rounded-full bg-[#0E6B5A]/10 flex items-center justify-center shrink-0">
          <Check className="h-3.5 w-3.5 text-[#0E6B5A]" strokeWidth={2.5} />
        </div>
        <span className="text-[12.5px] text-[#1F2937] font-medium flex-1 truncate">
          טיוטה נוצרה — אפשר לערוך למטה
        </span>
        <span className="text-[11.5px] text-[#0E6B5A] font-semibold shrink-0">פתח שוב</span>
      </button>
    );
  }

  // Default compact row
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl hover:bg-black/[0.03] transition-colors text-right"
      >
        <div className="h-6 w-6 rounded-full bg-[#0E6B5A]/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-[#0E6B5A]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-[#1F2937] leading-tight">יצירה עם AI</div>
          <div className="text-[11px] text-[#6B7280] leading-tight mt-0.5">תאר בכמה מילים — נבנה טיוטה</div>
        </div>
        <span className="text-[11.5px] text-[#0E6B5A] font-semibold shrink-0">פתח</span>
      </button>
    );
  }

  // Expanded
  return (
    <div className="rounded-xl bg-white ring-1 ring-black/[0.06] p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#0E6B5A]" />
          <span className="text-[12.5px] font-semibold text-[#1F2937]">יצירה עם AI</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-6 w-6 flex items-center justify-center rounded-full text-[#6B7280] hover:bg-black/5"
          aria-label="סגור"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="לדוגמה: התקנת מזגן עילי 2.5 כ״ס כולל חומרים ואחריות שנתיים"
        className="min-h-[84px] max-h-[110px] rounded-lg text-[13px] p-2.5 shadow-none ring-1 ring-black/[0.06]"
        disabled={loading}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] text-[#9CA3AF]">לא ממלא מחירים או תאריכים</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading || disabled}
          className="h-9 px-4 rounded-lg bg-[#0E6B5A] hover:bg-[#0A5446] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> יוצר…</>
          ) : (
            <>צור טיוטה</>
          )}
        </button>
      </div>
    </div>
  );
}
