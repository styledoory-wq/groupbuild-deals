import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  TrendingDown,
  Sparkles,
  Building2,
  Home,
  CheckCircle2,
  Star,
  Clock,
  Eye,
  Handshake,
  ChevronDown,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import mockupDeal from "@/assets/mockup-deal.jpg.asset.json";
import mockupDashboard from "@/assets/mockup-dashboard.jpg.asset.json";

/**
 * Public marketing landing page — desktop-first responsive, RTL Hebrew.
 * Clean, premium, emerald + ivory palette aligned to the app design system.
 * Route: /site
 */
export default function SiteLanding() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const goApp = () => navigate("/auth?mode=signup");
  const goLogin = () => navigate("/auth");

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#F7F5F0] text-[#0B1220] font-[Heebo,system-ui]">
      {/* ===== Top Nav ===== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F7F5F0]/80 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <BrandLogo variant="dark" size="sm" />
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-[#1F2937]/80">
            <a href="#how" className="hover:text-[#0E6B5A] transition">איך זה עובד</a>
            <a href="#why" className="hover:text-[#0E6B5A] transition">למה אנחנו</a>
            <a href="#audience" className="hover:text-[#0E6B5A] transition">למי זה מתאים</a>
            <a href="#faq" className="hover:text-[#0E6B5A] transition">שאלות נפוצות</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={goLogin}
              className="hidden sm:inline-flex h-10 px-4 rounded-full text-[13.5px] font-bold text-[#0B1220] hover:bg-black/5 transition"
            >
              התחברות
            </button>
            <button
              onClick={goApp}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-[13.5px] font-bold text-white bg-gradient-to-l from-[#0E6B5A] to-[#34A88E] shadow-[0_6px_18px_-8px_rgba(14,107,90,0.55)] hover:shadow-[0_10px_24px_-10px_rgba(14,107,90,0.65)] transition"
            >
              כניסה לאפליקציה
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-[#34A88E]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full bg-[#0E6B5A]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-10 pt-12 lg:pt-20 pb-12 lg:pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
          {/* Text side */}
          <div className="text-center lg:text-right order-2 lg:order-1">
            <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-[#0E6B5A]/15 text-[#0E6B5A] text-[11.5px] font-bold tracking-tight shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              פלטפורמת הרכש הקבוצתי הראשונה לדיירי בנייה חדשה
            </span>

            <h1 className="mt-6 text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] font-black tracking-tight text-[#0B1220]">
              קונים <span className="text-[#0E6B5A]">ביחד</span>.
              <br />
              חוסכים יותר. נהנים משקט.
            </h1>

            <p className="mt-6 text-[15.5px] lg:text-[17.5px] leading-relaxed text-[#4B5563] max-w-xl mx-auto lg:mx-0">
              GroupBuild מחבר בין דיירים בפרויקטים חדשים לספקים מובילים — מטבחים, ארונות, מזגנים, ריצוף ועוד.
              ככל שיותר שכנים מצטרפים, המחיר יורד. הכל שקוף, מאומת ופשוט.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
              <button
                onClick={goApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full text-[15px] font-bold text-white bg-gradient-to-l from-[#0E6B5A] to-[#34A88E] shadow-[0_12px_28px_-12px_rgba(14,107,90,0.6)] hover:scale-[1.02] active:scale-[0.98] transition"
              >
                התחילו לחסוך עכשיו
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/browse")}
                className="w-full sm:w-auto inline-flex items-center justify-center h-14 px-8 rounded-full text-[14.5px] font-bold text-[#0B1220] bg-white border border-black/10 hover:border-[#0E6B5A]/40 hover:text-[#0E6B5A] transition"
              >
                צפייה בעסקאות פעילות
              </button>
            </div>

            {/* trust strip */}
            <div className="mt-10 flex flex-wrap items-center lg:justify-start justify-center gap-x-6 gap-y-3 text-[12.5px] font-semibold text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#0E6B5A]" /> ספקים מאומתים</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 text-[#0E6B5A]" /> שקיפות מחירים מלאה</span>
              <span className="inline-flex items-center gap-1.5"><Handshake className="h-4 w-4 text-[#0E6B5A]" /> ללא עמלות נסתרות</span>
            </div>
          </div>

          {/* Phone mockup side */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0E6B5A]/15 via-transparent to-[#34A88E]/20 blur-2xl rounded-full" />
            <img
              src={mockupDeal.url}
              alt="אפליקציית GroupBuild — עסקה קבוצתית"
              width={1024}
              height={1536}
              className="relative w-[260px] sm:w-[320px] lg:w-[420px] h-auto drop-shadow-[0_30px_50px_rgba(11,18,32,0.18)]"
            />
          </div>
        </div>
      </section>

      {/* ===== Stats strip ===== */}
      <section className="border-y border-black/5 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { k: "עד 35%", v: "חיסכון ממוצע למשתתף" },
            { k: "100%", v: "ספקים מאומתים" },
            { k: "24 שעות", v: "זמן תגובה של ספק" },
            { k: "0₪", v: "דמי הצטרפות לדיירים" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-[clamp(1.6rem,3vw,2.2rem)] font-black text-[#0E6B5A] leading-none tracking-tight">
                {s.k}
              </div>
              <div className="mt-2 text-[12.5px] font-semibold text-[#6B7280]">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="max-w-7xl mx-auto px-5 lg:px-10 py-20 lg:py-28">
        <div className="text-center mb-14">
          <span className="text-[11.5px] font-bold tracking-[0.18em] text-[#0E6B5A] uppercase">איך זה עובד</span>
          <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight">
            ארבעה צעדים פשוטים לחיסכון אמיתי
          </h2>
          <p className="mt-3 text-[14.5px] text-[#6B7280] max-w-xl mx-auto">
            ככל שיותר דיירים בפרויקט מצטרפים לאותה עסקה — המחיר יורד אוטומטית.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {[
            { n: "01", t: "מצטרפים לפרויקט", d: "בוחרים את פרויקט הבנייה שלכם או יוצרים חדש." },
            { n: "02", t: "בוחרים קטגוריה", d: "מטבח, ארונות, מזגנים, ריצוף — מה שאתם צריכים." },
            { n: "03", t: "מצטרפים לעסקה", d: "מסמנים עניין בהצעה של ספק מאומת. בלי התחייבות." },
            { n: "04", t: "המחיר יורד", d: "ככל שיותר שכנים מצטרפים — המחיר לכל אחד יורד." },
          ].map((s) => (
            <div
              key={s.n}
              className="relative bg-white rounded-2xl p-6 border border-black/5 shadow-[0_8px_24px_-16px_rgba(11,18,32,0.18)] hover:shadow-[0_18px_40px_-22px_rgba(14,107,90,0.35)] hover:-translate-y-1 transition"
            >
              <div className="text-[12px] font-black text-[#0E6B5A] tracking-[0.18em]">{s.n}</div>
              <h3 className="mt-3 text-[16px] font-extrabold text-[#0B1220] tracking-tight">{s.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#6B7280]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Why us ===== */}
      <section id="why" className="bg-gradient-to-b from-white to-[#F7F5F0]">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-20 lg:py-28">
          <div className="text-center mb-14">
            <span className="text-[11.5px] font-bold tracking-[0.18em] text-[#0E6B5A] uppercase">למה GroupBuild</span>
            <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight">
              היתרונות שעושים את ההבדל
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { i: TrendingDown, t: "כוח קנייה אמיתי", d: "המחיר מתעדכן בזמן אמת לפי כמות המצטרפים. שקוף לכולם." },
              { i: ShieldCheck, t: "ספקים מאומתים", d: "כל ספק עובר בדיקת אמינות, רישוי וביקורות לפני שמצטרף." },
              { i: Users, t: "קהילת שכנים", d: "מצטרפים יחד לפרויקט אחד — אותה איכות, מחיר טוב יותר." },
              { i: Clock, t: "חוסך זמן יקר", d: "במקום להתרוצץ — כל ההצעות במקום אחד, מסודר ונוח." },
              { i: Eye, t: "שקיפות מלאה", d: "רואים בדיוק מי הספק, כמה משלמים, ומה כולל המחיר." },
              { i: Handshake, t: "ללא עמלות מהדייר", d: "השימוש בפלטפורמה חינמי לדיירים. בלי הפתעות." },
            ].map((b) => (
              <div
                key={b.t}
                className="bg-white rounded-2xl p-6 border border-black/5 shadow-[0_8px_24px_-16px_rgba(11,18,32,0.15)] hover:border-[#0E6B5A]/25 hover:shadow-[0_18px_40px_-22px_rgba(14,107,90,0.3)] transition"
              >
                <div className="h-11 w-11 rounded-xl bg-[#0E6B5A]/10 flex items-center justify-center mb-4">
                  <b.i className="h-5 w-5 text-[#0E6B5A]" />
                </div>
                <h3 className="text-[16px] font-extrabold tracking-tight">{b.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#6B7280]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Audience split ===== */}
      <section id="audience" className="max-w-7xl mx-auto px-5 lg:px-10 py-20 lg:py-28">
        <div className="text-center mb-14">
          <span className="text-[11.5px] font-bold tracking-[0.18em] text-[#0E6B5A] uppercase">למי זה מתאים</span>
          <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight">
            פלטפורמה אחת — שני צדדים שמרוויחים
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* Residents */}
          <article className="relative overflow-hidden rounded-3xl p-8 lg:p-10 bg-white border border-black/5 shadow-[0_20px_48px_-28px_rgba(11,18,32,0.22)]">
            <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[#0E6B5A]/8 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center">
                  <Home className="h-5 w-5 text-[#0E6B5A]" />
                </div>
                <h3 className="text-[20px] font-extrabold tracking-tight">לדיירים</h3>
              </div>
              <p className="text-[14px] text-[#6B7280] leading-relaxed mb-5">
                נכנסתם לבית חדש? אתם לא צריכים לנהל מו"מ לבד. בואו לקבל מחיר קבוצתי על כל מה שצריך.
              </p>
              <ul className="space-y-2.5">
                {[
                  "ללא דמי הצטרפות או עמלות",
                  "ספקים מאומתים בלבד",
                  "מעקב התקדמות בזמן אמת",
                  "תשלום ישיר לספק — בלי מתווכים",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[#0B1220]">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#0E6B5A] shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth?mode=signup&role=resident")}
                className="mt-7 inline-flex items-center gap-1.5 h-12 px-6 rounded-full text-[14px] font-bold text-white bg-[#0B1220] hover:bg-[#1F2937] transition"
              >
                הצטרפו כדייר
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </article>

          {/* Suppliers */}
          <article className="relative overflow-hidden rounded-3xl p-8 lg:p-10 bg-[#0B1220] text-white shadow-[0_20px_48px_-28px_rgba(11,18,32,0.45)]">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#34A88E]/25 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#34A88E]" />
                </div>
                <h3 className="text-[20px] font-extrabold tracking-tight">לספקים</h3>
              </div>
              <p className="text-[14px] text-white/70 leading-relaxed mb-5">
                גישה ישירה ללקוחות חמים בפרויקטים חדשים. בלי לידים יקרים ובלי בזבוז זמן.
              </p>
              <ul className="space-y-2.5">
                {[
                  "חשיפה לדיירים אמיתיים בלבד",
                  "כלי שיווק ועיצוב מובנים",
                  "ניהול הצעות וצמיחה במקום אחד",
                  "תמיכה אישית לאורך הדרך",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-white">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#34A88E] shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth?mode=signup&role=supplier")}
                className="mt-7 inline-flex items-center gap-1.5 h-12 px-6 rounded-full text-[14px] font-bold text-[#0B1220] bg-white hover:bg-[#F7F5F0] transition"
              >
                הצטרפו כספק
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* ===== Testimonial / quote ===== */}
      <section className="bg-white border-y border-black/5">
        <div className="max-w-4xl mx-auto px-5 lg:px-10 py-20 text-center">
          <div className="flex items-center justify-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4.5 w-4.5 fill-[#0E6B5A] text-[#0E6B5A]" />
            ))}
          </div>
          <p className="text-[clamp(1.1rem,2.2vw,1.5rem)] leading-relaxed font-semibold text-[#0B1220] tracking-tight">
            "תוך שבועיים הצטרפו 12 שכנים לעסקת המזגנים — חסכנו 28% מהמחיר הראשוני.
            פשוט, שקוף ובלי מאמץ."
          </p>
          <div className="mt-5 text-[13px] font-semibold text-[#6B7280]">
            רותם · פרויקט בנייה, ראשון לציון
          </div>
        </div>
      </section>

      {/* ===== Showcase with mockup ===== */}
      <section className="bg-gradient-to-b from-[#F7F5F0] to-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-20 lg:py-28 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div className="relative flex justify-center order-2 lg:order-1">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-[#34A88E]/15 via-transparent to-[#0E6B5A]/15 blur-2xl rounded-full" />
            <img
              src={mockupDashboard.url}
              alt="לוח בקרה בתוך אפליקציית GroupBuild"
              width={1024}
              height={1536}
              loading="lazy"
              className="relative w-[260px] sm:w-[320px] lg:w-[400px] h-auto drop-shadow-[0_30px_50px_rgba(11,18,32,0.18)]"
            />
          </div>

          <div className="text-center lg:text-right order-1 lg:order-2">
            <span className="text-[11.5px] font-bold tracking-[0.18em] text-[#0E6B5A] uppercase">הכל באפליקציה אחת</span>
            <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight">
              ניהול הבית החדש — בכף היד
            </h2>
            <p className="mt-4 text-[14.5px] lg:text-[16px] text-[#6B7280] leading-relaxed max-w-xl mx-auto lg:mx-0">
              קטגוריות מסודרות, עסקאות פעילות בפרויקט שלכם, התראות בזמן אמת על מחירים שיורדים, וצ׳אט ישיר עם הספק.
              הכל במקום אחד — מהבית, ובלי טלפונים מיותרים.
            </p>

            <ul className="mt-7 space-y-3 max-w-md mx-auto lg:mx-0 text-right">
              {[
                "התראה כשנפתחת עסקה חדשה בפרויקט שלך",
                "מעקב חי אחרי מספר המצטרפים והמחיר העדכני",
                "השוואת ספקים לפי דירוג, מחיר ואחריות",
                "תיעוד מלא של כל ההזמנות והאישורים",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[14px] font-semibold text-[#0B1220]">
                  <CheckCircle2 className="h-5 w-5 text-[#0E6B5A] shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="bg-white border-y border-black/5">
        <div className="max-w-3xl mx-auto px-5 lg:px-10 py-20 lg:py-28">
          <div className="text-center mb-12">
            <span className="text-[11.5px] font-bold tracking-[0.18em] text-[#0E6B5A] uppercase">שאלות נפוצות</span>
            <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight">
              כל מה שרציתם לדעת
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "כמה עולה להשתמש ב-GroupBuild?",
                a: "השימוש לדיירים חינמי לחלוטין — ללא דמי הצטרפות, ללא עמלות, וללא הפתעות. אתם משלמים רק על המוצר עצמו, ישירות לספק.",
              },
              {
                q: "איך בדיוק המחיר יורד?",
                a: "כל עסקה כוללת מדרגות מחיר — לדוגמה: 5 שכנים → ₪25,900, 10 שכנים → ₪24,900, 15 שכנים → ₪24,500. ככל שיותר שכנים מצטרפים, המחיר לכולם יורד אוטומטית.",
              },
              {
                q: "מי הספקים? איך אני יודע שהם אמינים?",
                a: "כל ספק עובר תהליך אימות מסודר — בדיקת רישיון עסק, ביקורות, ניסיון בפרויקטים דומים והתאמה לסטנדרטים שלנו. רק ספקים שעברו את הסינון מופיעים בפלטפורמה.",
              },
              {
                q: "האם אני מתחייב כשאני מצטרף לעסקה?",
                a: "ההצטרפות הראשונית היא רק הצהרת עניין — בלי כסף ובלי התחייבות. רק כשהעסקה סגורה ומאושרת, אתם מאשרים את ההזמנה ומעבירים את התשלום ישירות לספק (העברה בנקאית או ביט).",
              },
              {
                q: "איך מתבצע התשלום?",
                a: "התשלום מתבצע ישירות לספק — בהעברה בנקאית או ביט, לפי ההנחיות שמופיעות בעמוד העסקה. אנחנו לא לוקחים שום עמלת תיווך. הספק מאשר באפליקציה ברגע שקיבל.",
              },
              {
                q: "מתי אקבל את המוצר?",
                a: "כל ספק מציין בעסקה את זמן האספקה הצפוי (לרוב 30-60 ימים מהאישור). מעקב מלא על סטטוס ההזמנה שלכם נמצא תמיד באפליקציה.",
              },
            ].map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-black/8 bg-[#F7F5F0]/50 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-right hover:bg-[#F7F5F0] transition"
                  >
                    <span className="text-[15px] font-bold text-[#0B1220] tracking-tight">{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-[#0E6B5A] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 -mt-1 text-[13.5px] leading-relaxed text-[#4B5563]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="max-w-7xl mx-auto px-5 lg:px-10 py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-[28px] p-10 lg:p-16 text-center bg-gradient-to-br from-[#0E6B5A] to-[#0B1220] text-white shadow-[0_30px_60px_-30px_rgba(14,107,90,0.6)]">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#34A88E]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight max-w-2xl mx-auto">
              מוכנים לחסוך אלפי שקלים על הבית החדש?
            </h2>
            <p className="mt-4 text-[14.5px] lg:text-[16px] text-white/75 max-w-xl mx-auto">
              הצטרפו עכשיו — חינם, ללא התחייבות. ראו את העסקאות הפעילות בפרויקט שלכם בדקה.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={goApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full text-[15px] font-bold text-[#0B1220] bg-white hover:bg-[#F7F5F0] shadow-[0_12px_28px_-12px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition"
              >
                כניסה לאפליקציה
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center h-14 px-8 rounded-full text-[14.5px] font-bold text-white border border-white/25 hover:bg-white/10 transition"
              >
                כבר יש לי חשבון
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-black/5 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo variant="dark" size="sm" />
          <div className="flex items-center gap-6 text-[12.5px] font-semibold text-[#6B7280]">
            <button onClick={() => navigate("/privacy")} className="hover:text-[#0E6B5A] transition">פרטיות</button>
            <button onClick={() => navigate("/terms/residents")} className="hover:text-[#0E6B5A] transition">תנאי שימוש</button>
            <button onClick={() => navigate("/support")} className="hover:text-[#0E6B5A] transition">תמיכה</button>
          </div>
          <p className="text-[11.5px] text-[#9CA3AF]">
            © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לבנייה חדשה
          </p>
        </div>
      </footer>
    </div>
  );
}
