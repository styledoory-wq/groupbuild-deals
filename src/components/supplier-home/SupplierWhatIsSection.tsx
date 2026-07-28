import { Reveal } from "@/components/resident-home/Reveal";

export function SupplierWhatIsSection() {
  return (
    <section className="px-6 mt-8">
      <Reveal>
        <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
          למה זה משתלם לספקים
        </div>
        <h2 className="text-[22px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
          מה זה GroupBuild בשבילכם?
        </h2>
        <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
          דיירים מתאגדים לרכישה קבוצתית — ואתם מקבלים ביקוש מרוכז, מוכן לסגירה.
        </p>
      </Reveal>

      <Reveal delayMs={80} className="mt-4">
        <div
          className="rounded-[24px] p-4 text-white space-y-2.5 shadow-[0_16px_36px_-18px_rgba(14,107,90,0.55)]"
          style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #1A8870 55%, #34A88E 100%)" }}
        >
          {[
            "דיירים וועדים בפרויקטים אמיתיים",
            "ביקוש משותף לקטגוריה שלכם",
            "לידים חמים עם כוונת רכישה",
          ].map((label, i) => (
            <div key={label} className="flex items-center gap-2.5 text-[14px] font-bold">
              <span className="h-7 w-7 rounded-[10px] bg-white/15 inline-flex items-center justify-center text-[12px]">
                {i + 1}
              </span>
              {label}
            </div>
          ))}
          <p className="text-[12px] font-semibold text-white/75 pr-9 pt-1">
            פחות שיווק קר · יותר שיחות שנסגרות
          </p>
        </div>
      </Reveal>
    </section>
  );
}
