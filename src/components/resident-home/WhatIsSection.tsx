import { Reveal } from "./Reveal";

export function WhatIsSection() {
  return (
    <section className="px-6 mt-8">
      <Reveal>
        <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
          למה זה משתלם
        </div>
        <h2 className="text-[22px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
          מה זה GroupBuild?
        </h2>
        <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
          במקום שכל דייר יתמקח לבד — מתאגדים יחד, ומקבלים מחיר קבוצתי מספקים.
        </p>
      </Reveal>

      <Reveal delayMs={80} className="mt-4">
        <div
          className="rounded-[24px] p-4 text-white space-y-2.5 shadow-[0_16px_36px_-18px_rgba(14,107,90,0.55)]"
          style={{ background: "linear-gradient(135deg, rgba(14,107,90,0.95), #1A8870)" }}
        >
          {[
            "דיירים בפרויקט / בניין",
            "ביקוש משותף לספק",
            "מחיר מוזל ושקוף",
          ].map((label, i) => (
            <div key={label} className="flex items-center gap-2.5 text-[14px] font-bold">
              <span className="h-7 w-7 rounded-[10px] bg-white/15 inline-flex items-center justify-center text-[12px]">
                {i + 1}
              </span>
              {label}
            </div>
          ))}
          <p className="text-[12px] font-semibold text-white/75 pr-9 pt-1">
            התאגדות = כוח מיקוח = חיסכון אמיתי
          </p>
        </div>
      </Reveal>
    </section>
  );
}
