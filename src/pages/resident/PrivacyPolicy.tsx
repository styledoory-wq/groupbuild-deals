import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";

interface Section {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    title: "1. מבוא",
    body: (
      <p>
        GroupBuild ("האפליקציה") מחויבת להגנה על פרטיות המשתמשים. מדיניות זו מסבירה אילו נתונים אנו אוספים,
        כיצד אנו משתמשים בהם, ומהן זכויותיך.
      </p>
    ),
  },
  {
    title: "2. המידע שאנו אוספים",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>שם מלא, כתובת אימייל, מספר טלפון</li>
        <li>כתובת הדירה והפרויקט שאליו אתה משתייך</li>
        <li>נתוני שימוש באפליקציה (דפים שבוקרו, עסקאות שנצפו)</li>
        <li>מיקום משוער לצורך הצגת ספקים באזורך</li>
      </ul>
    ),
  },
  {
    title: "3. כיצד אנו משתמשים במידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>חיבור דיירים לעסקאות קבוצתיות רלוונטיות</li>
        <li>שליחת התראות על עסקאות חדשות באזורך</li>
        <li>שיפור חוויית המשתמש באפליקציה</li>
        <li>יצירת קשר עם ספקים בשמך לאחר הצטרפות לעסקה</li>
      </ul>
    ),
  },
  {
    title: "4. שיתוף מידע עם צדדים שלישיים",
    body: (
      <div className="space-y-2">
        <p>אנו לא מוכרים את המידע שלך. אנו משתפים מידע רק עם:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li>ספקים רלוונטיים לאחר הצטרפות לעסקה בלבד</li>
          <li>שירותי תשתית טכנית (Supabase לאחסון נתונים)</li>
        </ul>
      </div>
    ),
  },
  {
    title: "5. אבטחת מידע",
    body: (
      <p>
        המידע שלך מאוחסן בשרתים מאובטחים באירופה (AWS eu-west-1) ומוצפן בתקן גבוה.
      </p>
    ),
  },
  {
    title: "6. זכויותיך",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>לעיין במידע שנאסף עליך</li>
        <li>לתקן מידע שגוי</li>
        <li>למחוק את חשבונך ואת כל המידע הקשור אליו</li>
        <li>
          לפנות אלינו בכתובת:{" "}
          <a href="mailto:support@groupbuild.co.il" className="text-[#C9A84C] font-semibold underline">
            support@groupbuild.co.il
          </a>
        </li>
      </ul>
    ),
  },
  {
    title: "7. יצירת קשר",
    body: (
      <p>
        לשאלות בנושא פרטיות:{" "}
        <a href="mailto:support@groupbuild.co.il" className="text-[#C9A84C] font-semibold underline">
          support@groupbuild.co.il
        </a>
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen pb-32 font-[Heebo]">
        {/* Navy header */}
        <header
          className="relative px-5 pt-6 pb-8 text-white"
          style={{ background: "linear-gradient(160deg, #1F2937 0%, #1A2F4E 100%)" }}
        >
          <button
            onClick={() => navigate("/resident/profile")}
            aria-label="חזרה"
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 rotate-180" strokeWidth={2} />
          </button>

          <div className="mt-4">
            <h1 className="text-fs-xl font-extrabold leading-tight tracking-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
              מדיניות פרטיות
            </h1>
            <div className="mt-2 h-[2px] w-10 rounded-full bg-[#C9A84C]" />
            <p className="mt-3 text-fs-sm text-white/75">עודכן לאחרונה: יוני 2025</p>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 -mt-4 space-y-3">
          {SECTIONS.map((s, i) => (
            <section
              key={i}
              className="gb-card-enter bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)]"
            >
              <h2 className="text-fs-base font-extrabold text-[#1F2937] leading-snug">
                {s.title}
              </h2>
              <div className="mt-1 h-[2px] w-8 rounded-full bg-[#C9A84C]" />
              <div className="mt-3 text-fs-sm leading-relaxed text-[#334155]">
                {s.body}
              </div>
            </section>
          ))}

          <p className="text-center text-fs-xs text-[#94A3B8] pt-4">
            © GroupBuild — כל הזכויות שמורות
          </p>
        </div>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
