import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Home, Building2, Users, ShieldCheck, Clock, Eye, ChevronDown
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Landing() {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  return (
    <div dir="rtl" className="min-h-[100dvh] w-full bg-[#071C3B] text-white relative overflow-hidden">
      {/* Premium background layers */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #0A2147 0%, #081B38 55%, #050F25 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 18%, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 35%, transparent 70%)",
          }}
        />
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#D4AF37]/8 blur-3xl" />
        <div className="absolute top-1/2 -left-24 h-96 w-96 rounded-full bg-[#D4AF37]/6 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-screen-sm mx-auto flex flex-col">
        {/* Safe area + back button */}
        <div style={{ paddingTop: "max(env(safe-area-inset-top), 20px)" }} className="px-5 pt-5 pb-2 flex items-center">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-[#C9A961] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>חזרה</span>
          </button>
        </div>

        {/* HERO */}
        <section className="px-6 pt-4 pb-8 text-center">
          <div className="flex justify-center mb-5">
            <BrandLogo variant="light" size="md" />
          </div>
          <h1 className="text-[clamp(1.6rem,5.8vw,2.1rem)] font-extrabold leading-tight tracking-tight mb-3">
            איך GroupBuild עובד?
          </h1>
          <div className="mx-auto h-[2px] w-10 rounded-full bg-[#D4AF37] mb-3" />
          <p className="text-white/65 text-[15px] leading-relaxed max-w-[20rem] mx-auto">
            פלטפורמה שמחברת בין דיירים בפרויקטים חדשים לבין ספקים מובילים ויוצרת כוח קנייה קבוצתי שחוסך כסף לכולם.
          </p>
        </section>

        {/* SECTION 1 — For Residents */}
        <section className="px-5 pb-6">
          <div className="gb-tile-dark p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center shrink-0">
                <Home className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">דיירים</h2>
                <p className="text-xs text-white/50">מצטרפים לפרויקט ונהנים ממחירים קבוצתיים</p>
              </div>
            </div>
            <p className="text-[13px] text-white/70 leading-relaxed mb-5">
              מצטרפים לפרויקט שלכם, רואים הצעות מספקים, מצטרפים לעסקאות קבוצתיות, ונהנים ממחירים טובים יותר בזכות כוח הקנייה המשותף.
            </p>

            {/* Visual Steps */}
            <div className="space-y-0">
              {[
                { n: "1", t: "מצטרפים לפרויקט" },
                { n: "2", t: "בוחרים הצעה" },
                { n: "3", t: "מצטרפים לקבוצה" },
                { n: "4", t: "חוסכים כסף" },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-sm font-extrabold text-[#D4AF37]">
                      {step.n}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="h-6 w-px bg-[#D4AF37]/25 my-0.5" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white/90 pb-[2px]">{step.t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2 — For Suppliers */}
        <section className="px-5 pb-6">
          <div className="gb-tile-dark p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">ספקים</h2>
                <p className="text-xs text-white/50">מקבלים גישה ישירה לדיירים בפרויקטים חדשים</p>
              </div>
            </div>
            <p className="text-[13px] text-white/70 leading-relaxed mb-5">
              מפרסמים הצעות לפרויקטים חדשים, מקבלים גישה לקבוצות דיירים אמיתיות, מגדילים מכירות, ומקבלים לידים איכותיים במקום פרסום יקר.
            </p>

            {/* Visual Steps */}
            <div className="space-y-0">
              {[
                { n: "1", t: "מפרסמים הצעה" },
                { n: "2", t: "מקבלים חשיפה לדיירים" },
                { n: "3", t: "צוברים מצטרפים" },
                { n: "4", t: "סוגרים עסקאות" },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-sm font-extrabold text-[#D4AF37]">
                      {step.n}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="h-6 w-px bg-[#D4AF37]/25 my-0.5" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white/90 pb-[2px]">{step.t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — Why Use GroupBuild? */}
        <section className="px-5 pb-10">
          <div className="text-center mb-5">
            <h2 className="text-xl font-extrabold mb-1">למה להשתמש ב־GroupBuild?</h2>
            <div className="mx-auto h-[2px] w-8 rounded-full bg-[#D4AF37]" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              {
                icon: <Users className="h-5 w-5" />,
                title: "כוח קנייה קבוצתי",
                desc: "ככל שיותר דיירים מצטרפים, המחיר משתפר עבור כולם.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "ספקים מאומתים",
                desc: "עבודה מול ספקים איכותיים ומקצועיים בלבד.",
              },
              {
                icon: <Clock className="h-5 w-5" />,
                title: "חיסכון בזמן",
                desc: "כל ההצעות במקום אחד — בלי לחפש בכל מקום.",
              },
              {
                icon: <Eye className="h-5 w-5" />,
                title: "שקיפות מלאה",
                desc: "מעקב אחר הצעות, הצטרפויות ומחירים בזמן אמת.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-4 rounded-2xl border border-white/10 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
                    {card.icon}
                  </div>
                  <h3 className="text-sm font-bold">{card.title}</h3>
                </div>
                <p className="text-[13px] text-white/60 leading-relaxed pr-12">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom summary */}
        <section className="px-5 pb-12 text-center">
          <div
            className="p-5 rounded-2xl border border-[#D4AF37]/20 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, rgba(212,175,55,0.08) 0%, rgba(10,33,71,0.5) 100%)",
            }}
          >
            <div className="relative z-10">
              <p className="text-[15px] font-extrabold text-white mb-2">דיירים</p>
              <p className="text-[13px] text-white/60 mb-4">
                אני מצטרף לקבוצת דיירים ומקבל מחיר טוב יותר.
              </p>
              <div className="h-px bg-white/10 my-3" />
              <p className="text-[15px] font-extrabold text-white mb-2">ספקים</p>
              <p className="text-[13px] text-white/60">
                אני מקבל גישה ישירה לדיירים ויכול למכור יותר.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-5 pb-8 text-center text-[12px] text-white/30">
          © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לדיירי בנייה חדשה
        </footer>
      </div>
    </div>
  );
}
