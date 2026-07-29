import { Reveal } from "./Reveal";

export function WhatIsSection() {
  return (
    <section className="relative z-20 px-5 -mt-[72px] sm:-mt-[88px]">
      <Reveal>
        <div className="rounded-[28px] bg-white border border-[#E8EEEB] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.22)] p-5">
          <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
            למה זה משתלם
          </div>
          <h2 className="text-[22px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
            מה זה GroupBuild?
          </h2>
          <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
            במקום שכל דייר יתמקח לבד — מתאגדים יחד, ומקבלים מחיר קבוצתי מספקים.
          </p>

          <div
            className="mt-4 rounded-[22px] p-4 text-white space-y-2.5 shadow-[0_12px_28px_-16px_rgba(14,107,90,0.45)]"
            style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #1A8870 55%, #34A88E 100%)" }}
          >
            {[
              "דיירים בפרויקט / בניין",
              "ביקוש משותף לספק",
              "מחיר מוזל ושקוף",
            ].map((label, i) => (
              <Reveal key={label} delayMs={120 * i}>
                <div className="flex items-center gap-2.5 text-[14px] font-bold">
                  <span className="h-7 w-7 rounded-[10px] bg-white/15 inline-flex items-center justify-center text-[12px]">
                    {i + 1}
                  </span>
                  {label}
                </div>
              </Reveal>
            ))}
            <p className="text-[12px] font-semibold text-white/80 pr-9 pt-1">
              התאגדות = כוח מיקוח = חיסכון אמיתי
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
