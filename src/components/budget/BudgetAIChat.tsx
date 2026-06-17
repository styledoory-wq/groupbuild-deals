import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Lightbulb, TrendingDown, HelpCircle, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BudgetResult, ILS } from "@/lib/budgetPricing";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const QUICK: { q: string; icon: typeof Lightbulb; tint: string; color: string }[] = [
  { q: "איך אפשר לחסוך כאן?",          icon: TrendingDown,   tint: "#F0FDF4", color: "#16A34A" },
  { q: "מה כלול ומה לא?",               icon: ClipboardCheck, tint: "#EEF4FF", color: "#2563EB" },
  { q: "האם המחיר סביר לרמת הגמר?",     icon: Lightbulb,      tint: "#FFFBEB", color: "#0E6B5A" },
  { q: "אילו שאלות חשוב לשאול קבלן?",   icon: HelpCircle,     tint: "#F5F3FF", color: "#7C3AED" },
];

export function BudgetAIChat({ result }: { result: BudgetResult }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(nextMsgs);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("budget-assistant", {
        body: { budget: result, messages: nextMsgs },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply;
      if (!reply) throw new Error("לא התקבלה תשובה");
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה";
      if (msg.includes("429")) toast.error("יותר מדי בקשות, נסה בעוד רגע");
      else if (msg.includes("402")) toast.error("נגמרו הקרדיטים ל-AI");
      else toast.error(msg);
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-[28px] overflow-hidden border border-[#F0E6C7]"
      style={{
        fontFamily: "'Epilogue', system-ui, sans-serif",
        background: "linear-gradient(180deg, #FFFDF5 0%, #FFFFFF 50%)",
        boxShadow: "0 20px 50px -24px rgba(14,107,90,0.35), 0 4px 12px -6px rgba(31,41,55,0.06)",
      }}
    >
      {/* Premium header */}
      <div
        className="px-5 pt-5 pb-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FFF8E1 0%, #FFFBEB 60%, #FFFFFF 100%)" }}
      >
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full opacity-30 blur-2xl" style={{ background: "#0E6B5A" }} />
        <div className="relative flex items-start gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0E6B5A 0%, #E2BD45 100%)",
              boxShadow: "0 10px 24px -10px rgba(14,107,90,0.7), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <Sparkles className="h-6 w-6 text-white" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-[#1F2937] text-[17px] leading-tight" style={{ fontFamily: "'Urbanist'" }}>
                יועץ התקציב החכם
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: "#0E6B5A", letterSpacing: "0.04em" }}>
                AI
              </span>
            </div>
            <p className="text-[12px] text-[#6B7280] mt-1 leading-snug">
              מנתח את הערכת העלות שלך (<span className="font-bold text-[#1F2937]">{ILS(result.total.avg)}</span>) ועונה על כל שאלה — בלי למכור לך כלום.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-4 space-y-4">
        {msgs.length === 0 && (
          <>
            <div className="text-[11px] font-extrabold text-[#9CA3AF] tracking-wider" style={{ fontFamily: "'Urbanist'", letterSpacing: "0.08em" }}>
              התחל מאחת מהשאלות הפופולריות
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK.map(({ q, icon: Icon, tint, color }) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-right rounded-2xl p-3 transition active:scale-[0.98] disabled:opacity-50 flex flex-col gap-2"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EFE9D6",
                    boxShadow: "0 2px 6px -3px rgba(31,41,55,0.08)",
                  }}
                >
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: tint }}>
                    <Icon className="h-4 w-4" style={{ color }} strokeWidth={2.3} />
                  </div>
                  <span className="text-[12px] font-bold leading-snug text-[#1F2937]">{q}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {msgs.length > 0 && (
          <div ref={scrollRef} className="max-h-[420px] overflow-y-auto space-y-3 px-1 pb-1">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`text-[13.5px] leading-relaxed p-3.5 rounded-2xl whitespace-pre-wrap ${
                  m.role === "user"
                    ? "text-white mr-6 shadow-[0_8px_20px_-8px_rgba(14,107,90,0.55)]"
                    : "bg-white border border-[#EFE9D6] text-[#1F2937] ml-6 shadow-sm"
                }`}
                style={
                  m.role === "user"
                    ? { background: "linear-gradient(135deg, #0E6B5A 0%, #E2BD45 100%)" }
                    : undefined
                }
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-extrabold text-[#0E6B5A]" style={{ fontFamily: "'Urbanist'", letterSpacing: "0.05em" }}>
                    <Sparkles className="h-3 w-3" /> יועץ AI
                  </div>
                )}
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="ml-6 flex items-center gap-2 bg-white border border-[#EFE9D6] rounded-2xl p-3 w-fit">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
                <span className="text-[11px] text-[#6B7280] font-medium">היועץ מנתח...</span>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="relative flex items-center gap-2 bg-white border border-[#EFE9D6] rounded-2xl pr-2 pl-1.5 py-1.5 focus-within:border-[#0E6B5A] focus-within:shadow-[0_0_0_3px_rgba(14,107,90,0.12)] transition"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל את היועץ כל שאלה על התקציב..."
            className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1F2937] placeholder:text-[#9CA3AF] h-10 px-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 active:scale-95 transition"
            style={{
              background: "linear-gradient(135deg, #0E6B5A 0%, #E2BD45 100%)",
              boxShadow: "0 6px 14px -6px rgba(14,107,90,0.6)",
            }}
            aria-label="שלח"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {msgs.length === 0 && (
          <p className="text-[10.5px] text-[#9CA3AF] text-center pt-1">
            התשובות מבוססות נתוני שוק 2026 בלבד — אינן תחליף לייעוץ מקצועי
          </p>
        )}
      </div>
    </div>
  );
}
