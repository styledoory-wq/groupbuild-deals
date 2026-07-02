import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Briefcase, TrendingUp, Zap, ShieldCheck, Star, CheckCircle2 } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandMark } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public supplier landing page at "/suppliers".
 * Focused only on supplier value: qualified leads, real projects, more work,
 * easy registration, premium network, trust. No resident messaging.
 *
 * Logged-in suppliers are bounced straight to their dashboard.
 */
export default function SuppliersLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    if (user.role === "supplier") navigate("/supplier", { replace: true });
  }, [authReady, user, navigate]);

  // Signal supplier intent for the auth screen (locks role, skips picker).
  const setSupplierIntent = () => {
    try { sessionStorage.setItem("gb_intent", "supplier"); } catch { /* ignore */ }
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] w-full text-[#0B1220]" style={{ background: "#F7F5F0" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[#F7F5F0]/85 border-b border-[#E8E3D8]">
        <div className="max-w-screen-md mx-auto flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="h-9 w-auto" />
            <span className="font-extrabold text-[15px] tracking-tight" style={{ fontFamily: "'Rubik', 'Heebo', system-ui, sans-serif" }}>
              GroupBuild
            </span>
          </Link>
          <Link
            to="/auth/supplier?mode=signin"
            onClick={setSupplierIntent}
            className="text-[13px] font-semibold text-[#0E6B5A] hover:text-[#0A5446] transition-colors"
          >
            כבר רשום? התחבר
          </Link>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-5">
        {/* Hero */}
        <section className="pt-10 pb-8 md:pt-16 md:pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0E6B5A]/8 px-3 py-1 text-[11px] font-bold text-[#0E6B5A] mb-4">
            <Star className="h-3 w-3 fill-[#0E6B5A]" />
            רשת הספקים הפרימיום של GroupBuild
          </div>
          <h1 className="text-[clamp(1.9rem,6.4vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight text-[#0B1220]">
            לידים איכותיים,
            <br />
            מפרויקטים אמיתיים.
          </h1>
          <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed text-[#5B6472] max-w-[32rem] mx-auto">
            הצטרפו לרשת הספקים של GroupBuild וקבלו פניות ממוקדות מוועדי בית, שכונות חדשות ופרויקטים בהיקף גדול — בלי להוציא שקל על שיווק.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center">
            <Link to="/auth/supplier?mode=signup" onClick={setSupplierIntent} className="block">
              <Button
                className="w-full sm:w-auto h-[56px] rounded-[14px] text-base font-bold px-8 shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)] gap-2"
                style={{ background: "#0E6B5A" }}
              >
                הצטרף כספק
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/supplier?mode=signin" onClick={setSupplierIntent} className="block">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-[56px] rounded-[14px] text-base font-semibold px-8 border-[#0E6B5A]/25 text-[#0E6B5A] hover:bg-[#0E6B5A]/6"
              >
                כבר רשום? התחבר
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-[12px] text-[#6B7280] font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> ההרשמה פתוחה כעת</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> רשת ספקים נבחרת</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> הבטיחו את מקומכם</span>
          </div>
        </section>

        {/* Value grid */}
        <section className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ValueCard
              icon={Users}
              title="לידים איכותיים"
              desc="פניות ממוקדות מלקוחות שכבר בשל להזמין — לא רשימות תפוצה, לא ליצור קשר על תקלה קטנה."
            />
            <ValueCard
              icon={Briefcase}
              title="פרויקטים אמיתיים"
              desc="ועדי בתים, פרויקטי בנייה חדשים ושיפוצים בהיקף — היקפי עבודה שמצדיקים את הזמן שלכם."
            />
            <ValueCard
              icon={TrendingUp}
              title="יותר עבודה, פחות דיל‑חנטים"
              desc="קבוצות רכישה = הזמנה אחת במקום עשר. אתם עובדים ביעילות, הלקוח משלם פחות, כולם מרוויחים."
            />
            <ValueCard
              icon={Zap}
              title="הרשמה קלה"
              desc="פותחים חשבון תוך דקות, מעלים פרופיל, ומתחילים לקבל פניות. בלי בירוקרטיה, בלי טפסים ארוכים."
            />
            <ValueCard
              icon={ShieldCheck}
              title="רשת פרימיום"
              desc="הצטרפות דורשת אישור. אנו שומרים על ספקים איכותיים בלבד — כך שהמותג שלכם מופיע בסביבה נכונה."
            />
            <ValueCard
              icon={Star}
              title="בניית מוניטין"
              desc="דירוגים, ביקורות מאומתות ופרופיל מקצועי — לקוחות רואים בדיוק למה כדאי לבחור בכם."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="py-10">
          <h2 className="text-[22px] md:text-[26px] font-extrabold text-center tracking-tight">איך זה עובד?</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard n={1} title="נרשמים" desc="פותחים חשבון ספק בדקות ומגדירים תחום שירות ואזורי כיסוי." />
            <StepCard n={2} title="בונים פרופיל" desc="מוסיפים לוגו, גלריה, קטלוגים והצעות — כל מה שגורם ללקוח לבחור בכם." />
            <StepCard n={3} title="מקבלים לידים" desc="פניות מגיעות ישירות לתיבה שלכם. אתם עונים, סוגרים ומרוויחים." />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12">
          <div
            className="rounded-[24px] p-8 md:p-10 text-center text-white shadow-[0_20px_44px_-18px_rgba(10,31,61,0.35)]"
            style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #0A5446 100%)" }}
          >
            <h3 className="text-[22px] md:text-[26px] font-extrabold tracking-tight leading-tight">
              מוכנים להתחיל לקבל לידים?
            </h3>
            <p className="mt-3 text-white/85 text-[14px] max-w-[28rem] mx-auto leading-relaxed">
              הצטרפו לספקים הראשונים של GroupBuild והבטיחו את מקומכם ברשת.
            </p>
            <Link to="/auth/supplier?mode=signup" onClick={setSupplierIntent} className="inline-block mt-6">
              <Button className="h-[54px] rounded-[14px] text-base font-bold px-8 bg-white text-[#0E6B5A] hover:bg-white/90 gap-2">
                הצטרף כספק
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-8 text-center text-[12px] text-[#6B7280]">
          © {new Date().getFullYear()} GroupBuild ·{" "}
          <Link to="/terms/suppliers" className="hover:text-[#0E6B5A]">תנאי שימוש לספקים</Link>
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
