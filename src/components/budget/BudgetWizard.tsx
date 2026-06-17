import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WizardAnswers, WizardQuestion, groupByStep } from "@/lib/budgetWizard";

interface Props {
  questions: WizardQuestion[];
  initialAnswers?: WizardAnswers;
  themeAccent: string;
  themeRing: string;
  themeTint: string;
  onComplete: (answers: WizardAnswers) => void;
  onCancel: () => void;
}

export function BudgetWizard({ questions, initialAnswers = {}, themeAccent, themeRing, themeTint, onComplete, onCancel }: Props) {
  const [answers, setAnswers] = useState<WizardAnswers>(() => {
    const seeded: WizardAnswers = { ...initialAnswers };
    // Seed numeric defaults
    for (const q of questions) {
      if (q.type === "number" && q.numberConfig && seeded[q.id] === undefined) {
        seeded[q.id] = q.numberConfig.default;
      }
    }
    return seeded;
  });
  const [stepIdx, setStepIdx] = useState(0);

  const steps = useMemo(() => groupByStep(questions, answers), [questions, answers]);
  const currentStep = steps[stepIdx];
  const progress = ((stepIdx + 1) / steps.length) * 100;
  const isLast = stepIdx === steps.length - 1;

  if (!currentStep) return null;

  const setAnswer = (id: string, value: string | string[] | number) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  const toggleMulti = (id: string, value: string) => {
    const arr = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    setAnswer(id, arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const canAdvance = currentStep.questions.every((q) => {
    if (q.type === "multi") return true; // multi can be empty
    return answers[q.id] !== undefined && answers[q.id] !== "";
  });

  const goNext = () => {
    if (isLast) onComplete(answers);
    else setStepIdx((i) => i + 1);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-[0_4px_20px_-12px_rgba(31,41,55,0.12)] space-y-4" style={{ fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-extrabold" style={{ background: themeTint, color: themeAccent, fontFamily: "'Urbanist'" }}>
          <Sparkles className="h-3.5 w-3.5" />
          אשף דיוק · שלב {stepIdx + 1}/{steps.length}
        </div>
        <button onClick={onCancel} className="text-[11.5px] text-[#6B7280] hover:text-[#1F2937] font-bold">
          ביטול
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#F1F0EC] rounded-full overflow-hidden">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: themeAccent }} />
      </div>

      {/* Step title */}
      <div>
        <div className="text-[17px] font-extrabold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>{currentStep.title}</div>
        <div className="text-[12px] text-[#6B7280] mt-0.5">{currentStep.questions.length} שאלות בשלב הזה</div>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {currentStep.questions.map((q) => (
          <div key={q.id} className="space-y-2.5">
            <div>
              <div className="text-[14px] font-extrabold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>{q.title}</div>
              {q.subtitle && <div className="text-[11.5px] text-[#6B7280] mt-0.5">{q.subtitle}</div>}
            </div>

            {q.type === "number" && q.numberConfig && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={q.numberConfig.min}
                  max={q.numberConfig.max}
                  value={Number(answers[q.id] ?? q.numberConfig.default)}
                  onChange={(e) => setAnswer(q.id, +e.target.value)}
                  className="h-12 bg-white border border-[#E5E7EB] rounded-xl text-[15px] font-bold text-[#1F2937] text-right shadow-sm"
                />
                <span className="text-[12px] text-[#6B7280] font-bold whitespace-nowrap">{q.numberConfig.unit}</span>
              </div>
            )}

            {q.type === "single" && (
              <div className="space-y-2">
                {q.options?.map((opt) => {
                  const sel = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(q.id, opt.value)}
                      className="w-full text-right p-3.5 rounded-xl border-2 transition flex items-center justify-between gap-3"
                      style={{
                        background: sel ? themeTint : "#FFFFFF",
                        borderColor: sel ? themeAccent : "#E5E7EB",
                        boxShadow: sel ? `0 4px 14px -8px ${themeRing}` : "none",
                      }}
                    >
                      <span className="text-[13.5px] font-bold text-[#1F2937]">{opt.label}</span>
                      {sel && (
                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: themeAccent }}>
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "multi" && (
              <div className="space-y-2">
                {q.options?.map((opt) => {
                  const arr = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                  const sel = arr.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMulti(q.id, opt.value)}
                      className="w-full text-right p-3.5 rounded-xl border-2 transition flex items-center justify-between gap-3"
                      style={{
                        background: sel ? themeTint : "#FFFFFF",
                        borderColor: sel ? themeAccent : "#E5E7EB",
                      }}
                    >
                      <span className="text-[13.5px] font-bold text-[#1F2937]">{opt.label}</span>
                      <div
                        className="h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0"
                        style={{ background: sel ? themeAccent : "#FFFFFF", borderColor: sel ? themeAccent : "#D1D5DB" }}
                      >
                        {sel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 pt-2">
        {stepIdx > 0 && (
          <button
            onClick={() => setStepIdx((i) => i - 1)}
            className="h-12 px-4 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] text-[13px] font-extrabold flex items-center gap-1.5 active:scale-95 transition"
            style={{ fontFamily: "'Urbanist'" }}
          >
            <ChevronRight className="h-4 w-4" /> חזרה
          </button>
        )}
        <button
          onClick={goNext}
          disabled={!canAdvance}
          className="flex-1 h-12 rounded-xl text-white text-[14px] font-extrabold active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{
            fontFamily: "'Urbanist'",
            background: `linear-gradient(135deg, ${themeAccent} 0%, ${themeAccent}E0 100%)`,
            boxShadow: `0 10px 22px -10px ${themeRing}`,
          }}
        >
          {isLast ? "חשב תקציב מדויק" : "הבא"}
          {!isLast && <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
