import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Building2, Users, ShieldCheck, Clock, Eye, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { WhatsAppHelpButton } from "@/components/WhatsAppHelpButton";
import { Seo } from "@/components/seo/Seo";

/**
 * "How it works" page — aligned to the global Categories-based design system.
 * Light surface, soft shadows, 20px radius cards, navy + gold accents.
 */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-[100dvh] w-full" style={{ backgroundColor: "#F7F5F0" }}>
      <Seo title={"איך זה עובד | GroupBuild"} description={"מדריך קצר: איך רכישה קבוצתית עובדת ב-GroupBuild — מהצטרפות לפרויקט ועד קבלת המחיר הקבוצתי."} path="/landing" />
      <div
        className="relative z-10 w-full max-w-[var(--app-max-w,640px)] mx-auto flex flex-col"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-2 pb-1 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-[0_2px_8px_-4px_rgba(10,31,61,0.12)] text-[#1F2937] active:scale-95 transition"
            aria-label="חזרה"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <BrandLogo variant="dark" size="sm" />
          <span className="w-10" />
        </div>

        {/* Hero */}
        <section className="px-5 pt-6 pb-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[#FFF8E1] text-[#0A5446] text-[11px] font-bold tracking-tight">
            איך GroupBuild עובד
          </span>
          <h1 className="mt-4 text-[clamp(1.5rem,5vw,1.9rem)] font-extrabold leading-tight tracking-tight text-[#1F2937]">
            כוח קנייה קבוצתי לדיירי בנייה חדשה
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#6B7280] max-w-[22rem] mx-auto">
            פלטפורמה שמחברת בין דיירים בפרויקטים חדשים לספקים מובילים — וחוסכת לכולם כסף.
          </p>
        </section>

        {/* Residents card */}
        <section className="px-5 pb-4">
          <article className="bg-white rounded-[20px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0 bg-[#EEF3FB]">
                <Home className="h-5 w-5 text-[#1F2937]" />
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#1F2937] tracking-tight">דיירים</h2>
                <p className="text-[12px] text-[#6B7280] font-medium">מצטרפים לקבוצה, נהנים ממחיר טוב יותר</p>
              </div>
            </div>

            <ol className="space-y-2.5">
              {[
                "מצטרפים לפרויקט שלכם",
                "בוחרים הצעה מספק מאומת",
                "מצטרפים לקבוצת רכישה",
                "חוסכים כסף בזכות הכמות",
              ].map((t, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-[#F4F6FA]">
                  <span className="h-7 w-7 rounded-full bg-white text-[#1F2937] text-[13px] font-extrabold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(10,31,61,0.18)]">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#1F2937]">{t}</span>
                </li>
              ))}
            </ol>
          </article>
        </section>

        {/* Suppliers card */}
        <section className="px-5 pb-6">
          <article className="bg-white rounded-[20px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0 bg-[#FFF8E1]">
                <Building2 className="h-5 w-5 text-[#0A5446]" />
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#1F2937] tracking-tight">ספקים</h2>
                <p className="text-[12px] text-[#6B7280] font-medium">חשיפה ישירה לדיירים בפרויקטים חדשים</p>
              </div>
            </div>

            <ol className="space-y-2.5">
              {[
                "מפרסמים הצעה לפרויקט",
                "מקבלים חשיפה לדיירים אמיתיים",
                "צוברים מצטרפים בקבוצה",
                "סוגרים יותר עסקאות איכותיות",
              ].map((t, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-[#F4F6FA]">
                  <span className="h-7 w-7 rounded-full bg-white text-[#0A5446] text-[13px] font-extrabold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(10,31,61,0.18)]">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#1F2937]">{t}</span>
                </li>
              ))}
            </ol>
          </article>
        </section>

        {/* Why use it */}
        <section className="px-5 pb-6">
          <h2 className="text-[16px] font-extrabold text-[#1F2937] mb-3 text-center tracking-tight">
            למה GroupBuild?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, title: "כוח קבוצתי", desc: "יותר משתתפים = מחיר טוב יותר" },
              { icon: ShieldCheck, title: "ספקים מאומתים", desc: "עבודה עם מקצוענים בלבד" },
              { icon: Clock, title: "חיסכון בזמן", desc: "הכל במקום אחד" },
              { icon: Eye, title: "שקיפות מלאה", desc: "מעקב מחירים בזמן אמת" },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-[18px] p-3.5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]"
              >
                <div className="h-9 w-9 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center mb-2">
                  <c.icon className="h-4 w-4 text-[#0A5446]" />
                </div>
                <h3 className="text-[13.5px] font-extrabold text-[#1F2937] tracking-tight">{c.title}</h3>
                <p className="text-[12px] text-[#6B7280] font-medium leading-snug mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-10">
          <Button
            variant="premium"
            className="w-full h-14 text-[15px] flex items-center justify-center gap-2"
            onClick={() => navigate("/auth?mode=signup")}
          >
            התחילו עכשיו
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => navigate("/browse")}
            className="mt-3 w-full h-12 rounded-[14px] border border-[#1F2937]/15 bg-white text-[14px] font-bold text-[#1F2937] hover:bg-[#F4F6FA] transition-colors"
          >
            צפה בעסקאות ללא הרשמה
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="mt-3 w-full text-center text-[13px] font-semibold text-[#6B7280] hover:text-[#1F2937] transition-colors"
          >
            כבר יש לי חשבון — התחברות
          </button>
        </section>

        <p className="px-5 pb-6 text-center text-[11px] text-[#9CA3AF]">
          © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לדיירי בנייה חדשה
        </p>
      </div>

      <WhatsAppHelpButton bottomOffset={20} />
    </div>
  );
}
