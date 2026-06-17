import { Link } from "react-router-dom";

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
          GroupBuild ("הפלטפורמה", "אנחנו") מחויבת להגנה על פרטיות המשתמשים.
          מדיניות זו מסבירה אילו נתונים נאספים, כיצד הם משמשים, עם מי הם משותפים, ומהן זכויותיך.
        </p>
        <p>
          הפעילות מנוהלת בכפוף ל<b>חוק הגנת הפרטיות, התשמ"א-1981</b> ותקנותיו.
          המדיניות מהווה חלק בלתי נפרד מתנאי השימוש.
        </p>
      </div>
    ),
  },
  {
    title: "2. המידע שאנו אוספים",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li><b>זיהוי:</b> שם מלא, אימייל, טלפון</li>
        <li><b>מיקום:</b> כתובת הדירה, הפרויקט, עיר</li>
        <li><b>שימוש:</b> דפים שבוקרו, עסקאות שנצפו, חיפושים</li>
        <li><b>טכני:</b> כתובת IP, סוג מכשיר, דפדפן, עוגיות</li>
        <li><b>תשלום:</b> פרטי אשראי לא נשמרים אצלנו – הם עוברים ישירות לסולק (CardCom) בתקן PCI-DSS</li>
      </ul>
    ),
  },
  {
    title: "3. בסיס משפטי לעיבוד",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>הסכמה (שניתנה בעת ההרשמה)</li>
        <li>ביצוע חוזה</li>
        <li>חובה חוקית (שמירת רשומות חשבונאיות)</li>
        <li>אינטרס לגיטימי (אבטחה ומניעת הונאות)</li>
      </ul>
    ),
  },
  {
    title: "4. כיצד אנו משתמשים במידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>חיבור דיירים לעסקאות קבוצתיות באזורם</li>
        <li>שליחת התראות על עסקאות חדשות וסטטוס פיקדונות</li>
        <li>שיפור חוויית המשתמש וניתוח ביצועים</li>
        <li>יצירת קשר עם ספקים בשמך – רק לאחר הצטרפות פעילה להצעה</li>
        <li>מניעת הונאות והגנה על המשתמשים</li>
      </ul>
    ),
  },
  {
    title: "5. שיתוף מידע עם צדדים שלישיים",
    body: (
      <div className="space-y-2">
        <p>איננו מוכרים מידע אישי. שיתוף מתבצע רק עם:</p>
        <ul className="list-disc pr-5 space-y-1.5">
          <li>ספקים — רק לאחר הצטרפות אקטיבית להצעה</li>
          <li>סולק תשלומים (CardCom) — לעיבוד פיקדונות בתקן PCI-DSS</li>
          <li>ספקי תשתית טכנית — אחסון מאובטח באיחוד האירופי, בכפוף ל-DPA</li>
          <li>רשויות מוסמכות — כאשר נדרש על פי דין</li>
        </ul>
      </div>
    ),
  },
  {
    title: "6. עוגיות (Cookies)",
    body: (
      <p>
        הפלטפורמה משתמשת בעוגיות לשמירת מצב התחברות, העדפות, וניתוח שימוש.
        ניתן לחסום עוגיות דרך הדפדפן, אך הדבר עשוי לפגוע בתפקוד הפלטפורמה.
      </p>
    ),
  },
  {
    title: "7. תקופת שמירת המידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>פרטי חשבון — כל עוד החשבון פעיל</li>
        <li>היסטוריית עסקאות וחשבוניות — 7 שנים (חובת דיני מס)</li>
        <li>נתוני אנליטיקה אנונימיים — עד 24 חודשים</li>
        <li>בסגירת חשבון — מחיקה או אנונימיזציה תוך 30 ימים</li>
      </ul>
    ),
  },
  {
    title: "8. אבטחת מידע",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>הצפנת TLS 1.2+ בכל תעבורת הנתונים</li>
        <li>אחסון מאובטח באיחוד האירופי (AWS eu-west-1)</li>
        <li>בקרת גישה מבוססת תפקידים (RLS) במסד הנתונים</li>
        <li>סיסמאות בהצפנה חד-כיוונית (bcrypt)</li>
        <li>גיבויים יומיים מוצפנים וניטור אבטחה</li>
      </ul>
    ),
  },
  {
    title: "9. זכויותיך על פי דין",
    body: (
      <ul className="list-disc pr-5 space-y-1.5">
        <li>זכות עיון במידע שנאסף עליך</li>
        <li>זכות תיקון מידע שגוי</li>
        <li>זכות מחיקת חשבונך (בכפוף לחובות שמירה חוקיות)</li>
        <li>זכות התנגדות לעיבוד למטרות שיווק ישיר</li>
        <li>זכות ניידות המידע</li>
        <li>זכות להגיש תלונה לרשות להגנת הפרטיות</li>
      </ul>
    ),
  },
  {
    title: "10. קטינים",
    body: (
      <p>
        הפלטפורמה מיועדת לבני 18 ומעלה. אם נודע לנו על איסוף מידע מקטין — נמחק אותו לאלתר.
      </p>
    ),
  },
  {
    title: "11. שינויים במדיניות",
    body: (
      <p>
        נשמרת לנו הזכות לעדכן מדיניות זו. שינוי מהותי יובא לידיעת המשתמשים
        בהודעה בפלטפורמה ו/או באימייל, לפחות 14 ימים לפני כניסתו לתוקף.
      </p>
    ),
  },
  {
    title: "12. יצירת קשר",
    body: (
      <div className="space-y-1">
        <p>פניות בנושא פרטיות: <a href="mailto:privacy@groupbuild.co.il" className="text-primary underline">privacy@groupbuild.co.il</a></p>
        <p>תמיכה כללית: <a href="mailto:support@groupbuild.co.il" className="text-primary underline">support@groupbuild.co.il</a></p>
      </div>
    ),
  },
];

export default function Privacy() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">GroupBuild</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/support" className="hover:underline">תמיכה</Link>
            <Link to="/" className="hover:underline">דף הבית</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">מדיניות פרטיות</h1>
          <p className="text-sm text-muted-foreground mt-1">עודכן לאחרונה: יוני 2026 · גרסה 2.0</p>
        </div>

        {SECTIONS.map((s, i) => (
          <section key={i} className="space-y-3">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <div className="text-sm leading-relaxed text-foreground/85">{s.body}</div>
          </section>
        ))}
      </main>
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GroupBuild — כל הזכויות שמורות
      </footer>
    </div>
  );
}
