import { Reveal } from "@/components/resident-home/Reveal";
import { Building2, ShieldCheck, Sparkles } from "lucide-react";

const points = [
  {
    icon: Building2,
    title: "קבוצה בבניין שלכם",
    text: "מצטרפים לדיירים מאותו בניין ויוצרים כוח קנייה אמיתי מול ספקים.",
  },
  {
    icon: ShieldCheck,
    title: "שקיפות מלאה",
    text: "רואים הצעות, התקדמות והחלטות במקום אחד — בלי טלפונים מפוזרים.",
  },
  {
    icon: Sparkles,
    title: "תוצאה טובה יותר",
    text: "תחרות בין ספקים + התארגנות קבוצתית = מחיר ושירות טובים יותר.",
  },
];

export function WhatIsSection() {
  return (
    <section className="relative z-10 -mt-[72px] px-4 pb-16 sm:-mt-[88px] sm:px-6 sm:pb-20 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#0E6B5A]/10 bg-white shadow-[0_24px_60px_rgba(11,18,32,0.12)]">
        <div className="px-5 py-12 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-[#0E6B5A]">מה זה GroupBuild</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0B1220] sm:text-4xl">
                פלטפורמה שמארגנת דיירים לעסקאות משותפות
              </h2>
              <p className="mt-4 text-base leading-8 text-[#5B6472] sm:text-lg">
                במקום שכל דייר יתמודד לבד מול ספקים, GroupBuild בונה קבוצה חכמה בבניין — עם תהליך ברור,
                הצעות תחרותיות ומעקב עד הביצוע.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {points.map((point, index) => (
              <Reveal key={point.title} delayMs={index * 80}>
                <div className="h-full rounded-3xl bg-[#F7F5F0] p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0E6B5A]/10 text-[#0E6B5A]">
                    <point.icon className="size-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#0B1220]">{point.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5B6472]">{point.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
