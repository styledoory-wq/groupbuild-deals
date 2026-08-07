import { Reveal } from "@/components/resident-home/Reveal";

export function SupplierWhatIsSection() {
  return (
    <section className="relative z-20 px-5 -mt-[72px] sm:-mt-[88px]">
      {/* eager: card overlaps the hero and must be sharp on first paint */}
      <Reveal eager>
        <div className="rounded-[28px] bg-white border border-[#E8EEEB] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.22)] p-5 lg:p-9">
          <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
            למה זה משתלם לספקים
          </div>
          <h2 className="text-[22px] lg:text-[30px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
            מה זה GroupBuild בשבילכם?
          </h2>
          <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
            דיירים מתאגדים לרכישה קבוצתית — ואתם מקבלים ביקוש מרוכז, מוכן לסגירה.
          </p>

          <div
            className="mt-4 rounded-[22px] p-4 lg:p-6 text-white space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 shadow-[0_12px_28px_-16px_rgba(14,107,90,0.45)]"
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
            <p className="text-[12px] font-semibold text-white/80 pr-9 pt-1 lg:col-span-3 lg:pr-0 lg:pt-3">
              פחות שיווק קר · יותר שיחות שנסגרות
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
