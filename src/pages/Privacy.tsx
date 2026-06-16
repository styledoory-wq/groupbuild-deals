import { Link } from "react-router-dom";

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
        <h1 className="text-3xl font-bold">מדיניות פרטיות</h1>
        <p className="text-sm text-muted-foreground">עודכן לאחרונה: יוני 2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. מבוא</h2>
          <p>GroupBuild ("האפליקציה", "אנחנו") מחויבת להגנה על פרטיות המשתמשים. מדיניות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, ומהן זכויותיך.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. המידע שאנו אוספים</h2>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>שם מלא, כתובת אימייל, מספר טלפון</li>
            <li>כתובת הדירה והפרויקט שאליו אתה משתייך</li>
            <li>נתוני שימוש באפליקציה (דפים שבוקרו, עסקאות שנצפו)</li>
            <li>מיקום משוער לצורך הצגת ספקים באזורך</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. כיצד אנו משתמשים במידע</h2>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>חיבור דיירים לעסקאות קבוצתיות רלוונטיות</li>
            <li>שליחת התראות על עסקאות חדשות באזורך</li>
            <li>שיפור חוויית המשתמש באפליקציה</li>
            <li>יצירת קשר עם ספקים בשמך לאחר הצטרפות לעסקה</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. שיתוף מידע עם צדדים שלישיים</h2>
          <p>איננו מוכרים מידע אישי. אנו משתפים מידע רק עם:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>ספקים רלוונטיים — לאחר שהצטרפת לעסקה בלבד</li>
            <li>ספקי תשתית טכנית (אחסון נתונים מאובטח)</li>
            <li>ספק סליקה (CardCom) — לעיבוד פיקדונות מאובטח</li>
            <li>רשויות חוק — כאשר נדרש על פי דין</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. אבטחת מידע</h2>
          <p>אנו משתמשים בהצפנת TLS, אחסון מאובטח, ובקרת גישה מבוססת תפקידים (RLS) להגנה על המידע שלך.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. זכויותיך</h2>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>גישה למידע שלך</li>
            <li>תיקון מידע שגוי</li>
            <li>מחיקת חשבונך והמידע הקשור אליו</li>
            <li>ביטול קבלת התראות</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. יצירת קשר</h2>
          <p>לכל שאלה בנושא פרטיות, ניתן לפנות אלינו: <a href="mailto:support@groupbuild.co.il" className="text-primary underline">support@groupbuild.co.il</a></p>
        </section>
      </main>
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GroupBuild
      </footer>
    </div>
  );
}
