import { Link, useSearchParams } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SupplierWhatIsSection } from "@/components/supplier-home/SupplierWhatIsSection";
import {
  SupplierHeroTransition,
  supplierHeroOverlap,
  type SupplierHeroVariant,
} from "@/components/supplier-home/SupplierHeroTransition";
import { cn } from "@/lib/utils";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

const OPTIONS: { id: SupplierHeroVariant; title: string; note: string }[] = [
  { id: "a", title: "A — Dissolve ארוך + Wave", note: "מסכה ~320px + גל עדין + overlap ~80px" },
  { id: "b", title: "B — Organic + Overlap עמוק", note: "קצה אורגני + overlap ~100px" },
  { id: "c", title: "C — Pure Long Mask", note: "בלי גל — רק מסכה ארוכה ~380px" },
  { id: "d", title: "D — Layered Veil", note: "שכבות קרם רכות + עקומה עדינה" },
];

function HeroPreview({ variant }: { variant: SupplierHeroVariant }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#F7F5F0]" dir="rtl">
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-cover bg-[center_32%]"
        style={{ backgroundImage: `url("${HERO_BG}")`, minHeight: "100%" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(270deg, rgba(11,18,32,0.52) 0%, rgba(11,18,32,0.34) 28%, rgba(11,18,32,0.12) 48%, rgba(11,18,32,0) 68%)",
        }}
      />
      <SupplierHeroTransition variant={variant} />

      <div
        className="relative z-[2] px-5 pb-28 pt-2 min-h-[560px] flex flex-col"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
      >
        <header className="flex items-start justify-between gap-3 mb-10">
          <div style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }}>
            <BrandLogo variant="light" size="lg" className="h-12" />
          </div>
          <span className="text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-md px-3.5 py-1.5 rounded-full shrink-0 inline-flex items-center gap-1.5">
            <UserCircle2 className="h-3.5 w-3.5" />
            התחברות
          </span>
        </header>

        <div className="max-w-[18rem] mt-2">
          <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-extrabold mb-3 border border-white/25">
            רשת ספקים לפרויקטי בנייה
          </div>
          <h1
            className="text-[30px] font-extrabold text-white leading-[1.15] tracking-tight"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}
          >
            לידים איכותיים
          </h1>
          <p
            className="mt-1 text-[30px] font-extrabold text-[#7DDBB8] leading-[1.15] tracking-tight"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.3)" }}
          >
            מפרויקטים אמיתיים
          </p>
          <p
            className="mt-3 text-[14.5px] text-white/90 font-medium leading-relaxed"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.35)" }}
          >
            פניות מדיירים וועדים שכבר מתאגדים לקנייה — בלי שיווק קר.
          </p>
        </div>

        <div className="mt-auto pt-10 mx-auto w-full max-w-sm space-y-2.5 pb-2">
          <div
            className="flex h-14 items-center justify-center rounded-2xl text-white text-[15px] font-extrabold shadow-[0_12px_28px_-10px_rgba(14,107,90,0.55)]"
            style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #1A8870 100%)" }}
          >
            הצטרף כספק
          </div>
          <div
            className="flex h-11 items-center justify-center text-[14px] font-bold text-white"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
          >
            כבר רשום? התחבר
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SupplierHeroDemos() {
  const [params, setParams] = useSearchParams();
  const focus = (params.get("v") as SupplierHeroVariant | null) ?? null;

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#1a1f27] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1f27]/95 backdrop-blur-md px-4 py-4">
        <p className="text-center text-lg font-extrabold">השוואת מעבר Hero — תוכן אמיתי</p>
        <p className="text-center text-sm text-white/60 mt-1">
          אותה תמונה · לוגו · טקסטים · רק המעבר שונה
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setParams({ v: opt.id })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold border transition",
                focus === opt.id
                  ? "bg-[#0E6B5A] border-[#0E6B5A] text-white"
                  : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10",
              )}
            >
              {opt.id.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setParams({})}
            className="rounded-full px-3 py-1.5 text-xs font-bold border border-white/15 bg-white/5 text-white/80"
          >
            הכל
          </button>
        </div>
        <p className="text-center mt-3">
          <Link to="/suppliers" className="text-[#7DDBB8] text-sm font-semibold">
            חזרה לעמוד הספקים
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-screen-sm px-4 py-8 space-y-10">
        {OPTIONS.filter((o) => !focus || focus === o.id).map((opt) => (
          <div key={opt.id} id={`opt-${opt.id}`}>
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-extrabold text-base">{opt.title}</p>
              <p className="text-sm text-white/60 mt-0.5">{opt.note}</p>
            </div>
            <div className="overflow-hidden rounded-[28px] border-4 border-[#0f131a] shadow-2xl bg-[#F7F5F0]">
              <HeroPreview variant={opt.id} />
              <SupplierWhatIsSection overlapClass={supplierHeroOverlap(opt.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
