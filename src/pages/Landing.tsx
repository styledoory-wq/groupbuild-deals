import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowLeft, Building2, CheckCircle2, Home, Store, LogIn, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/auth";

export default function Landing() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userType, setUserType] = useState<"resident" | "supplier">("resident");

  // Detect session WITHOUT auto-redirecting. Landing always renders.
  useEffect(() => {
    let cancelled = false;
    const load = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (cancelled) return;
      if (!session) {
        setIsAuthed(false);
        setUserEmail("");
        return;
      }
      setIsAuthed(true);
      setUserEmail(session.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setUserType((profile?.user_type as "resident" | "supplier") ?? "resident");
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const goToDashboard = () => {
    if (!isAuthed) { navigate("/auth"); return; }
    if (isAdminEmail(userEmail)) { navigate("/admin"); return; }
    navigate(userType === "supplier" ? "/supplier" : "/resident");
  };

  const goSignup = () => navigate("/auth?mode=signup");
  const goLogin = () => navigate("/auth?mode=signin");

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] relative">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur border-b border-white/5">
          <div className="flex items-center justify-between px-5 h-14">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-extrabold text-base">
                <span className="gb-gold-text">Group</span>Build
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAuthed ? (
                <Button
                  type="button"
                  onClick={goToDashboard}
                  className="h-9 px-4 rounded-xl bg-gradient-gold text-primary hover:opacity-90 font-bold text-xs shadow-gold"
                >
                  המשך לדשבורד
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={goLogin}
                    variant="ghost"
                    className="h-9 px-3 rounded-xl text-primary-foreground hover:text-gold hover:bg-white/5 font-bold text-xs"
                  >
                    התחברות
                  </Button>
                  <Button
                    type="button"
                    onClick={goSignup}
                    className="h-9 px-4 rounded-xl bg-gradient-gold text-primary hover:opacity-90 font-bold text-xs shadow-gold"
                  >
                    הרשמה
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative px-6 pt-10 pb-12 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

          <div className="relative animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/12 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-medium text-primary-foreground/90">
                מצטרפים לפרויקטים בכל הארץ
              </span>
            </div>

            <h1 className="text-[34px] leading-[1.15] font-extrabold mb-4">
              קנה את הדירה שלך
              <br />
              במחיר{" "}
              <span className="gb-gold-text">קבוצתי</span>
            </h1>
            <div className="gb-divider-gold mb-5" />
            <p className="text-primary-foreground/75 text-[15px] leading-relaxed mb-8">
              פלטפורמת רכישה קבוצתית לדיירי פרויקטים חדשים. הצטרפו לשכנים שלכם,
              אספו כוח קנייה — וקבלו מחירים שאי אפשר לקבל לבד.
            </p>

            <div className="flex flex-col gap-3">
              {isAuthed ? (
                <Button
                  onClick={goToDashboard}
                  className="h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
                >
                  המשך לדשבורד שלך
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={goSignup}
                    className="h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    הרשמה
                  </Button>
                  <button
                    type="button"
                    onClick={goLogin}
                    className="text-sm text-primary-foreground/85 hover:text-gold underline-offset-4 hover:underline transition-smooth inline-flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    כבר רשום? התחבר
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-10 -mt-2 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "+240", l: "דירות בפרויקט הדגמה" },
              { v: "₪34K", l: "חיסכון ממוצע לדירה" },
              { v: "+5", l: "קטגוריות פעילות" },
              { v: "29%", l: "הנחה קבוצתית ממוצעת" },
            ].map((s, i) => (
              <div key={i} className="gb-card p-4 text-center">
                <div className="text-xl font-extrabold gb-gold-text mb-1">{s.v}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="text-center mb-6">
            <div className="gb-divider-gold mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">שלושה צעדים פשוטים</h2>
            <p className="text-sm text-muted-foreground">ככה זה עובד אצלנו</p>
          </div>

          <div className="space-y-3">
            {[
              { n: "01", t: "הצטרפו לפרויקט שלכם", d: "חפשו את שם הבניין או הפרויקט שרכשתם בו דירה והצטרפו לקהילת הדיירים." },
              { n: "02", t: "בחרו ספקים ועסקאות", d: "עיינו בספקים מאומתים לפי קטגוריה ואזור, וראו מחיר נוכחי לפי כמות מצטרפים." },
              { n: "03", t: "המחיר יורד אוטומטית", d: "כל שכן שמצטרף מוריד את המחיר לכולם. ככל שיותר מצטרפים — כך כולם חוסכים." },
              { n: "04", t: "סגרו עסקה בביטחון", d: "שוחחו עם הספק, עקבו אחרי ההתקדמות, ושלמו פיקדון מאובטח כשמערכת התשלומים פעילה." },
            ].map((step) => (
              <div key={step.n} className="gb-card p-4 flex gap-3">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-primary text-gold flex items-center justify-center font-extrabold text-sm">
                  {step.n}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm mb-1">{step.t}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RESIDENTS BENEFITS */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="gb-card p-5 bg-gradient-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <Home className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="text-lg font-extrabold">למה זה משתלם לדיירים?</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "כוח קנייה של כל הבניין",
                "ספקים לפי אזור מגורים",
                "מחירים שמתעדכנים לפי מצטרפים אמיתיים",
                "פחות כאב ראש מול ספקים",
                "שקיפות במחיר ובמדרגות ההנחה",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SUPPLIERS BENEFITS */}
        <section className="bg-background text-foreground px-6 pb-12 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="gb-card p-5 bg-gradient-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <Store className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="text-lg font-extrabold">למה ספקים ירצו להצטרף?</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "לידים איכותיים מפרויקטים חדשים",
                "לקוחות לפי אזור שירות",
                "עסקאות בכמות במקום לקוח בודד",
                "ניהול הצעות ומבצעים ממקום אחד",
                "חשיפה לקהילות דיירים רלוונטיות",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-gradient-hero text-primary-foreground px-6 py-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="gb-divider-gold mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold mb-2">מוכנים להתחיל לחסוך?</h2>
            <p className="text-sm text-primary-foreground/75 mb-6 max-w-xs mx-auto">
              צרו חשבון בחינם והתחילו לראות עסקאות באזור שלכם תוך דקה.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button
                onClick={isAuthed ? goToDashboard : goSignup}
                className="h-12 px-8 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold inline-flex items-center justify-center gap-2"
              >
                {isAuthed ? "המשך לדשבורד" : "הרשמה חינם"}
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {!isAuthed && (
                <button
                  type="button"
                  onClick={goLogin}
                  className="text-xs text-primary-foreground/80 hover:text-gold underline-offset-4 hover:underline"
                >
                  כבר רשום? התחבר
                </button>
              )}
            </div>
          </div>
        </section>

        <footer className="bg-primary text-primary-foreground/60 px-6 py-6 text-center text-[11px] border-t border-white/5">
          © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לדיירי בנייה חדשה
        </footer>
      </div>
    </div>
  );
}
