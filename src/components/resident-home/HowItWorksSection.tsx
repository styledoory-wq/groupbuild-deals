import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "1",
    title: "מצטרפים לקבוצה",
    text: "הבניין או הפרויקט שלכם — כוח משותף מול ספקים.",
  },
  {
    n: "2",
    title: "בוחרים הצעה",
    text: "ספקים והצעות משתלמות לפי קטגוריה ומיקום.",
  },
  {
    n: "3",
    title: "חוסכים יחד",
    text: "מחיר קבוצתי שקוף — בלי משא ומתן לבד.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="px-6 mt-9">
      <Reveal>
        <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
          3 צעדים
        </div>
        <h2 className="text-[22px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
          איך זה עובד?
        </h2>
        <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
          פשוט, מהיר, בלי סיבוכים.
        </p>
      </Reveal>

      <div className="mt-4 space-y-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delayMs={80 * (i + 1)}>
            <article className="grid grid-cols-[44px_1fr] gap-3 p-3.5 rounded-[20px] bg-white border border-[#E4DFD4] shadow-[0_10px_30px_-16px_rgba(11,18,32,0.14)]">
              <div className="h-11 w-11 rounded-2xl bg-[#E8F5F1] text-[#0E6B5A] font-extrabold text-[16px] flex items-center justify-center">
                {s.n}
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-[#0B1220]">{s.title}</h3>
                <p className="mt-1 text-[13px] text-[#5B6573] leading-snug">{s.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
