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
    title: "1. מבוא וכללי",
    body: (
      <div className="space-y-2">
        <p>
          GroupBuild ("הפלטפורמה", "אנחנו") מחויבת להגנה על פרטיות המשתמשים בפלטפורמה.
          מדיניות פרטיות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, עם מי אנו משתפים אותם, וכן את זכויותיך על פי דין.
        </p>
        <p>
          המדיניות חלה על כל המשתמשים בפלטפורמה (דיירים וספקים) ומהווה חלק בלתי נפרד מתנאי השימוש.
          הפעילות מנוהלת בכפוף ל<b>חוק הגנת הפרטיות, התשמ"א-1981</b>, לתקנותיו, ולחקיקה ישימה נוספת.
        </p>
      </div>
    ),
  },
  {
    title: "2. המידע שאנו אוספים",
    body: (
      <div className="space-y-2">
        <p>אנו אוספים את סוגי המידע הבאים:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li><b>פרטי זיהוי:</b> שם מלא, אימייל, מספר טלפון</li>
          <li><b>פרטי מיקום:</b> כתובת הדירה, הפרויקט אליו אתה משתייך, עיר/אזור</li>
          <li><b>פרטי שימוש:</b> דפים שבוקרו, עסקאות שנצפו, חיפושים, לחיצות</li>
          <li><b>פרטים טכניים:</b> כתובת IP, סוג מכשיר, דפדפן, מערכת הפעלה, מזהי עוגיות</li>
          <li><b>פרטי תקשורת:</b> פניות לשירות לקוחות, התכתבויות עם ספקים דרך הפלטפורמה</li>
          <li><b>פרטי תשלום:</b> פרטי אשראי לא נשמרים אצלנו – הם נמסרים ישירות לסולק המורשה (CardCom) בתקן PCI-DSS</li>
        </ul>
      </div>
    ),
  },
  {
    title: "3. בסיס משפטי לעיבוד מידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li><b>הסכמה</b> – נתת אותה בעת ההרשמה ובעת הצטרפות להצעות</li>
        <li><b>ביצוע חוזה</b> – נדרש כדי לספק לך את שירותי הפלטפורמה</li>
        <li><b>חובה חוקית</b> – שמירת רשומות חשבונאיות, מענה לדרישות רשויות</li>
        <li><b>אינטרס לגיטימי</b> – שיפור השירות, מניעת הונאות ואבטחת מידע</li>
      </ul>
    ),
  },
  {
    title: "4. כיצד אנו משתמשים במידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>חיבור דיירים לעסקאות קבוצתיות רלוונטיות באזורם</li>
        <li>העברת פרטים לספק לאחר הצטרפות פעילה להצעה</li>
        <li>שליחת התראות על עסקאות, סטטוס פיקדונות ועדכוני מערכת</li>
        <li>שיפור חוויית המשתמש, פיתוח תכונות חדשות וניתוח ביצועים</li>
        <li>מניעת הונאות, שימוש לרעה והגנה על ביטחון המשתמשים</li>
        <li>שליחת דיוור שיווקי – רק לאחר קבלת הסכמתך, וניתן להסיר בכל עת</li>
        <li>עמידה בדרישות חוקיות ומענה לבקשות מרשויות מוסמכות</li>
      </ul>
    ),
  },
  {
    title: "5. שיתוף מידע עם צדדים שלישיים",
    body: (
      <div className="space-y-2">
        <p>איננו מוכרים מידע אישי לצדדים שלישיים. שיתוף מתבצע אך ורק עם:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li><b>ספקים</b> – רק לאחר שהצטרפת אקטיבית להצעה שלהם (שם, טלפון, כתובת הפרויקט)</li>
          <li><b>סולק תשלומים</b> (CardCom או דומה) – לעיבוד פיקדונות בתקן PCI-DSS</li>
          <li><b>ספקי תשתית טכנית</b> (אחסון ענן מאובטח באיחוד האירופי) – בכפוף להסכמי עיבוד נתונים (DPA)</li>
          <li><b>שירותי אנליטיקה ומניעת הונאות</b> – במצב מצומצם ככל הניתן</li>
          <li><b>רשויות מוסמכות</b> – כשנדרש על פי דין (צו בית משפט, חקירת רשויות אכיפה)</li>
          <li><b>במקרה של מיזוג/רכישה</b> – המידע עשוי לעבור לישות הרוכשת, בכפוף למחויבות לעמוד בתנאי מדיניות זו</li>
        </ul>
      </div>
    ),
  },
  {
    title: "6. עוגיות (Cookies) וטכנולוגיות מעקב",
    body: (
      <div className="space-y-2">
        <p>הפלטפורמה משתמשת בעוגיות לצורך:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li>שמירת מצב התחברות (Session)</li>
          <li>שמירת העדפות משתמש</li>
          <li>ניתוח שימוש ושיפור הביצועים (Analytics)</li>
        </ul>
        <p>
          ניתן לחסום או למחוק עוגיות דרך הגדרות הדפדפן, אך הדבר עשוי לפגוע בחלק מתפקודי הפלטפורמה.
        </p>
      </div>
    ),
  },
  {
    title: "7. תקופת שמירת המידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>פרטי חשבון – נשמרים כל עוד החשבון פעיל</li>
        <li>היסטוריית עסקאות ומסמכי חשבונאות – 7 שנים, כנדרש על פי דיני המס</li>
        <li>נתוני אנליטיקה אנונימיים – עד 24 חודשים</li>
        <li>בעת סגירת חשבון – נמחק או יאונומיזה תוך 30 ימים, למעט מידע שעלינו לשמור על פי דין</li>
      </ul>
    ),
  },
  {
    title: "8. אבטחת מידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>הצפנת TLS 1.2+ בכל תעבורת הנתונים</li>
        <li>אחסון בשרתי ענן מאובטחים באיחוד האירופי (AWS eu-west-1)</li>
        <li>בקרת גישה מבוססת תפקידים (RLS) ברמת מסד הנתונים</li>
        <li>סיסמאות מאוחסנות באמצעות hashing חד-כיווני (bcrypt)</li>
        <li>גיבויים יומיים מוצפנים</li>
        <li>ניטור אבטחה ולוגים של פעולות רגישות</li>
      </ul>
    ),
  },
  {
    title: "9. זכויותיך על פי דין",
    body: (
      <div className="space-y-2">
        <p>בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, עומדות לך הזכויות הבאות:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li><b>זכות עיון</b> – לבקש לראות את המידע שנאסף עליך</li>
          <li><b>זכות תיקון</b> – לתקן מידע שגוי או לא מעודכן</li>
          <li><b>זכות למחיקה</b> – לבקש מחיקת חשבונך והמידע הקשור (בכפוף לחובות שמירה חוקיות)</li>
          <li><b>זכות התנגדות</b> – להתנגד לעיבוד למטרות שיווק ישיר</li>
          <li><b>זכות ניידות</b> – לקבל את המידע שלך בפורמט קריא ולהעבירו</li>
          <li><b>זכות להגיש תלונה</b> – לרשם מאגרי המידע ברשות להגנת הפרטיות</li>
        </ul>
        <p>לממימוש כל זכות, ניתן לפנות אלינו ב-<a href="mailto:privacy@groupbuild.co.il" className="text-[#1A8870] font-semibold underline">privacy@groupbuild.co.il</a>. נשיב לבקשתך תוך 30 ימים.</p>
      </div>
    ),
  },
  {
    title: "10. העברת מידע אל מחוץ לישראל",
    body: (
      <p>
        חלק משירותי התשתית שלנו (אחסון, אנליטיקה) פועלים בשרתים באיחוד האירופי.
        העברת המידע מתבצעת בכפוף להוראות חוק הגנת הפרטיות ולתקנות העברת מידע למדינות זרות,
        תוך וידוא רמת הגנה דומה לזו הקיימת בישראל.
      </p>
    ),
  },
  {
    title: "11. קטינים",
    body: (
      <p>
        הפלטפורמה מיועדת לבני 18 ומעלה. איננו אוספים ביודעין מידע על קטינים מתחת לגיל 18.
        אם נודע לנו על איסוף מידע כזה – נמחק אותו לאלתר.
      </p>
    ),
  },
  {
    title: "12. שינויים במדיניות",
    body: (
      <p>
        אנו רשאים לעדכן את מדיניות הפרטיות מעת לעת. שינוי מהותי יובא לידיעת המשתמשים
        בהודעה בפלטפורמה ו/או באימייל, לפחות 14 ימים לפני כניסתו לתוקף.
      </p>
    ),
  },
  {
    title: "13. יצירת קשר",
    body: (
      <div className="space-y-1">
        <p>לכל שאלה, בקשה או תלונה בנושאי פרטיות, ניתן לפנות:</p>
        <p>אימייל ייעודי: <a href="mailto:privacy@groupbuild.co.il" className="text-[#1A8870] font-semibold underline">privacy@groupbuild.co.il</a></p>
        <p>תמיכה כללית: <a href="mailto:support@groupbuild.co.il" className="text-[#1A8870] font-semibold underline">support@groupbuild.co.il</a></p>
      </div>
    ),
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen pb-32 font-[Heebo]">
        <header
          className="relative px-5 pt-6 pb-8 text-white"
          style={{ background: "linear-gradient(160deg, #1F2937 0%, #1A2F4E 100%)" }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="חזרה"
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 rotate-180" strokeWidth={2} />
          </button>

          <div className="mt-4">
            <h1 className="text-fs-xl font-extrabold leading-tight tracking-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
              מדיניות פרטיות
            </h1>
            <div className="mt-2 h-[2px] w-10 rounded-full bg-[#1A8870]" />
            <p className="mt-3 text-fs-sm text-white/75">עודכן לאחרונה: יוני 2026 · גרסה 2.0</p>
          </div>
        </header>

        <div className="px-5 -mt-4 space-y-3">
          {SECTIONS.map((s, i) => (
            <section
              key={i}
              className="gb-card-enter bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)]"
            >
              <h2 className="text-fs-base font-extrabold text-[#1F2937] leading-snug">
                {s.title}
              </h2>
              <div className="mt-1 h-[2px] w-8 rounded-full bg-[#1A8870]" />
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
