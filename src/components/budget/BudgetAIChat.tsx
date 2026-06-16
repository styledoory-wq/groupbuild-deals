import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BudgetResult, ILS } from "@/lib/budgetPricing";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const QUICK = [
  "איך אפשר לחסוך כאן?",
  "מה כלול ומה לא?",
  "האם המחיר סביר לרמת הגמר?",
  "אילו שאלות חשוב לשאול קבלן?",
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
      setMsgs((m) => m.slice(0, -1)); // remove the user msg on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#ECEEF2] space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#D4AF37]" />
        <h3 className="font-extrabold text-[#0A1F3D] text-[15px]">יועץ התקציב החכם</h3>
      </div>
      <p className="text-[12px] text-[#6B7280]">
        מבוסס על הערכת העלות שלך ({ILS(result.total.avg)}). שואל, מסביר וממליץ — לא ממציא מחירים.
      </p>

      {msgs.length === 0 && (
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="text-right text-[12px] font-medium bg-[#F4F6FA] hover:bg-[#E9ECF2] rounded-xl p-3 text-[#0A1F3D] transition disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {msgs.length > 0 && (
        <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-2 px-1">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`text-[13px] leading-relaxed p-3 rounded-2xl whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#0A1F3D] text-white mr-6"
                  : "bg-[#F4F6FA] text-[#0A1F3D] ml-6"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="ml-6 text-[#9CA3AF] text-[12px] flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 animate-pulse" /> חושב...
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="שאל שאלה..."
          className="flex-1 h-11"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} variant="premium" className="h-11 px-4">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
