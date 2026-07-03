import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, PiggyBank, Hammer, Building, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandMark } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public resident landing page at "/residents".
 * Focused only on resident value: saving money, group buying, building committees,
 * renovation, new construction, trust and simplicity. No supplier messaging.
 *
 * Logged-in residents are bounced straight to their dashboard.
 */
export default function ResidentsLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    if (user.role === "resident") navigate("/resident", { replace: true });
  }, [authReady, user, navigate]);

  // Signal resident intent for the auth screen (locks role, skips picker).
  const setResidentIntent = () => {
    try { sessionStorage.setItem("gb_intent", "resident"); } catch { /* ignore */ }
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] w-full text-[#0B1220]" style={{ background: "#F7F5F0" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur bg-[#F7F5F0]/85 border-b border-[#E8E3D8]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-screen-md mx-auto flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="h-9 w-auto" />
            <span className="font-extrabold text-[15px] tracking-tight" style={{ fontFamily: "'Rubik', 'Heebo', system-ui, sans-serif" }}>
              GroupBuild
            </span>
          </Link>
          <Link
            to="/auth/resident?mode=signin"
            onClick={setResidentIntent}
            className="text-[13px] font-semibold text-[#0E6B5A] hover:text-[#0A5446] transition-colors"
          >
            הרשמה / התחברות
          </Link>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-5">
        {/* Hero */}
        <section className="pt-10 pb-8 md:pt-16 md:pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0E6B5A]/8 px-3 py-1 text-[11px] font-bold text-[#0E6B5A] mb-4">
            <Sparkles className="h-3 w-3" />
            כוח קנייה קבוצתי לוועדי בית ושכונות
          </div>
          <h1 className="text-[clamp(1.9rem,6.4vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight text-[#0B1220]">
            תחסכו יחד.
            <br />
            תשלמו פחות.
          </h1>
          <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed text-[#5B6472] max-w-[32rem] mx-auto">
            GroupBuild מחבר בין דיירים, ועדי בית ושכונות שלמות לספקים איכותיים — כך שתוכלו לקבל עבודות שיפוץ, בנייה ותחזוקה במחירים שאף אחד לא יכול להשיג לבד.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center">
            <Link to="/auth/resident?mode=signup" onClick={setResidentIntent} className="block">
              <Button
                className="w-full sm:w-auto h-[56px] rounded-[14px] text-base font-bold px-8 shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)] gap-2"
                style={{ background: "#0E6B5A" }}
              >
                מצא הצעה משתלמת
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/resident?mode=signin" onClick={setResidentIntent} className="block">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-[56px] rounded-[14px] text-base font-semibold px-8 border-[#0E6B5A]/25 text-[#0E6B5A] hover:bg-[#0E6B5A]/6"
              >
                כבר רשום? התחבר
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[#6B7280] font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> הרשמה חינם</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> ללא מחויבות</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> ספקים מאומתים</span>
          </div>
        </section>

        {/* Value grid */}
        <section className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ValueCard
              icon={PiggyBank}
              title="חיסכון אמיתי"
              desc="אפשרות לחיסכון משמעותי באמצעות רכישה קבוצתית — בהתאם לגודל הקבוצה ולפרויקט."
            />
            <ValueCard
              icon={Users}
              title="ועד בית פשוט"
              desc="כלי אחד לניהול הצעות מחיר, אישורים והתקשרות עם ספקים — בלי קבוצות וואטסאפ מבולגנות."
            />
            <ValueCard
              icon={Hammer}
              title="שיפוצים והחלפות"
              desc="מזגנים, דודים, צבע חוץ, גינון, ניקיון — כל מה שהבניין צריך במחיר קבוצתי."
            />
            <ValueCard
              icon={Building}
              title="פרויקטים חדשים"
              desc="בנייה חדשה או שכונה שרק מתאכלסת? מרכזים הזמנות של עשרות דיירים למחיר אחד משתלם."
            />
            <ValueCard
              icon={ShieldCheck}
              title="ספקים מאומתים"
              desc="רק ספקים שעברו סינון. ביקורות אמיתיות, פרופיל מקצועי ותשלום דרך הפלטפורמה."
            />
            <ValueCard
              icon={Sparkles}
              title="פשוט לתפעל"
              desc="פותחים את האפליקציה, בוחרים הצעה, מצטרפים בלחיצה. בלי טפסים, בלי בירוקרטיה."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="py-10">
          <h2 className="text-[22px] md:text-[26px] font-extrabold text-center tracking-tight">איך זה עובד?</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard n={1} title="מוצאים הצעה" desc="גולשים בהצעות שרלוונטיות לבניין או לשכונה שלכם — או פותחים ביקוש חדש." />
            <StepCard n={2} title="מצטרפים יחד" desc="ככל שיותר שכנים מצטרפים, המחיר יורד. אתם רואים בזמן אמת כמה חוסכים." />
            <StepCard n={3} title="מבצעים בפועל" desc="הספק המאומת מבצע את העבודה. הכל מנוהל דרך GroupBuild — פשוט ובטוח." />
          </div>
        </section>

        {/* Trust / social */}
        <section className="py-8">
          <div className="rounded-[20px] bg-white border border-[#EFEAE0] p-6 md:p-8 shadow-[0_4px_14px_-6px_rgba(10,31,61,0.12)]">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-[18px] bg-[#0E6B5A]/8 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-8 w-8 text-[#0E6B5A]" />
              </div>
              <div className="flex-1 text-center md:text-right">
                <h3 className="text-[17px] font-extrabold leading-tight text-[#0B1220]">
                  שקיפות מלאה. תשלום רק כשמבצעים.
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#5B6472]">
                  לא משלמים כלום עד שבוחרים להצטרף להצעה. כל התהליך מתועד, וכל הכספים מנוהלים דרך הפלטפורמה עם קבלות ושקיפות מלאה לוועד ולדיירים.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12">
          <div
            className="rounded-[24px] p-8 md:p-10 text-center text-white shadow-[0_20px_44px_-18px_rgba(10,31,61,0.35)]"
            style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #0A5446 100%)" }}
          >
            <h3 className="text-[22px] md:text-[26px] font-extrabold tracking-tight leading-tight">
              מוכנים להתחיל לחסוך?
            </h3>
            <p className="mt-3 text-white/85 text-[14px] max-w-[28rem] mx-auto leading-relaxed">
              ההרשמה חינם. תוך דקות אתם רואים אילו הצעות פעילות בבניין ובאזור שלכם.
            </p>
            <Link to="/auth/resident?mode=signup" onClick={setResidentIntent} className="inline-block mt-6">
              <Button className="h-[54px] rounded-[14px] text-base font-bold px-8 bg-white text-[#0E6B5A] hover:bg-white/90 gap-2">
                מצא הצעה משתלמת
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-8 text-center text-[12px] text-[#6B7280]">
          © {new Date().getFullYear()} GroupBuild ·{" "}
          <Link to="/terms/residents" className="hover:text-[#0E6B5A]">תנאי שימוש לדיירים</Link>
        </footer>
      </main>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-[18px] p-5 shadow-[0_4px_14px_-6px_rgba(10,31,61,0.12)] border border-[#EFEAE0]">
      <div className="h-11 w-11 rounded-[12px] flex items-center justify-center bg-[#0E6B5A]/8 mb-3">
        <Icon className="h-5 w-5 text-[#0E6B5A]" />
      </div>
      <h3 className="text-[15px] font-extrabold leading-tight">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#5B6472]">{desc}</p>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className={cn(
      "relative bg-white rounded-[18px] p-5 shadow-[0_4px_14px_-6px_rgba(10,31,61,0.12)] border border-[#EFEAE0]",
    )}>
      <div className="absolute -top-3 right-5 h-8 w-8 rounded-full bg-[#0E6B5A] text-white flex items-center justify-center font-extrabold text-sm shadow-[0_6px_14px_-4px_rgba(14,107,90,0.55)]">
        {n}
      </div>
      <h3 className="mt-2 text-[15px] font-extrabold leading-tight">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#5B6472]">{desc}</p>
    </div>
  );
}
