import { Target, Building2, ShieldCheck, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/resident-home/Reveal";

const BENEFITS = [
  {
    icon: Target,
    title: "לידים איכותיים",
    text: "פניות מדיירים עם כוונת רכישה — לא לידים קרים.",
    tint: "bg-[#E8F5F1] text-[#0E6B5A]",
  },
  {
    icon: Building2,
    title: "פרויקטים בהיקף",
    text: "ועדי בית ושכונות חדשות עם ביקוש מרוכז.",
    tint: "bg-[#E8F1F8] text-[#1D6B8A]",
  },
  {
    icon: ShieldCheck,
    title: "רשת מאומתת",
    text: "פרופיל מקצועי שמציג אתכם באמון מול דיירים.",
    tint: "bg-[#EEF6EA] text-[#3F7A3A]",
  },
  {
    icon: TrendingUp,
    title: "יותר עבודה",
    text: "חשיפה מתמשכת להצעות שלכם בלי קמפיינים יקרים.",
    tint: "bg-[#F3F0E8] text-[#8A6A2E]",
  },
];

export function SupplierBenefitsSection() {
  return (
    <section className="px-6 mt-9">
      <Reveal>
        <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#E8F5F1] text-[#0E6B5A] text-[11px] font-extrabold mb-2.5">
          יתרונות
        </div>
        <h2 className="text-[22px] font-extrabold text-[#0B1220] tracking-tight leading-snug">
          למה ספקים מצטרפים
        </h2>
        <p className="mt-2 text-[14px] text-[#5B6573] leading-relaxed">
          ארבעה דברים שמרגישים מיד.
        </p>
      </Reveal>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <Reveal key={b.title} delayMs={80 * (i + 1)}>
              <article className="h-full min-h-[148px] p-4 rounded-[20px] bg-white border border-[#D5DED9] shadow-[0_10px_30px_-16px_rgba(11,18,32,0.14)]">
                <div className={`h-9 w-9 rounded-[14px] flex items-center justify-center mb-3 ${b.tint}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </div>
                <h3 className="text-[14px] font-extrabold text-[#0B1220]">{b.title}</h3>
                <p className="mt-1.5 text-[12.5px] text-[#5B6573] leading-snug">{b.text}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
