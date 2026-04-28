import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThankYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col">
        {/* Header */}
        <header className="px-5 h-14 flex items-center border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-gold flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-extrabold text-base">
              <span className="gb-gold-text">Group</span>Build
            </span>
          </div>
        </header>

        {/* Hero confirmation */}
        <main className="flex-1 px-6 pt-12 pb-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative h-24 w-24 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold animate-fade-up">
              <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={2.5} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 mb-4">
            <Sparkles className="h-3 w-3 text-gold" />
            <span className="text-[11px] font-bold text-gold">נרשמת בהצלחה</span>
          </div>

          <h1 className="text-3xl font-extrabold mb-3 leading-tight">
            תודה רבה!
            <br />
            <span className="gb-gold-text">אנחנו על זה.</span>
          </h1>
          <div className="gb-divider-gold mb-5" />

          <p className="text-primary-foreground/80 text-[15px] leading-relaxed max-w-[340px] mb-8">
            הפרטים שלך נקלטו במערכת. נחזור אליך בהקדם עם פרטי הפרויקט שלך
            וההצעות הקבוצתיות הראשונות שמתאימות לך.
          </p>

          {/* Steps */}
          <div className="w-full space-y-3 mb-10">
            {[
              { n: "1", t: "הפרטים שלך התקבלו אצלנו", d: "צוות GroupBuild קיבל התראה מיידית." },
              { n: "2", t: "ניצור איתך קשר בקרוב", d: "נחזור אליך לאימות פרטים והשלמת ההרשמה." },
              { n: "3", t: "תקבל גישה לעסקאות הקבוצתיות", d: "מחירים מיוחדים שמורידים את העלות לכולם." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3 items-start text-right bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-gold text-primary font-extrabold flex items-center justify-center text-sm">
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm mb-0.5">{s.t}</h3>
                  <p className="text-xs text-primary-foreground/70 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            חזרה לעמוד הבית
          </Button>

          <p className="text-[11px] text-primary-foreground/50 mt-6">
            יש שאלה? כתבו לנו ונחזור אליכם.
          </p>
        </main>
      </div>
    </div>
  );
}
