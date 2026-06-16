import { Link } from "react-router-dom";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";

export default function Support() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">GroupBuild</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/privacy" className="hover:underline">פרטיות</Link>
            <Link to="/" className="hover:underline">דף הבית</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">תמיכה ועזרה</h1>
          <p className="text-muted-foreground">אנחנו כאן בשבילך. בחר את הדרך הנוחה ביותר לפנייה.</p>
        </div>

        <section className="grid sm:grid-cols-2 gap-4">
          <a href="mailto:support@groupbuild.co.il" className="border rounded-lg p-5 hover:bg-accent transition flex items-start gap-3">
            <Mail className="text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">אימייל</h3>
              <p className="text-sm text-muted-foreground">support@groupbuild.co.il</p>
              <p className="text-xs text-muted-foreground mt-1">מענה תוך 24 שעות בימי עסקים</p>
            </div>
          </a>

          <a href="https://wa.me/972500000000" target="_blank" rel="noopener noreferrer" className="border rounded-lg p-5 hover:bg-accent transition flex items-start gap-3">
            <MessageCircle className="text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">צ'אט מהיר עם הצוות</p>
              <p className="text-xs text-muted-foreground mt-1">א'-ה' 9:00-18:00</p>
            </div>
          </a>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="text-primary" /> שאלות נפוצות
          </h2>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">מה זה GroupBuild?</h3>
              <p className="text-sm text-muted-foreground">פלטפורמה לרכישות קבוצתיות לדיירים בפרויקטים חדשים — חיסכון משמעותי על מוצרים ושירותים לבית.</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">איך מצטרפים לעסקה?</h3>
              <p className="text-sm text-muted-foreground">נכנסים לאפליקציה, בוחרים פרויקט וקטגוריה, מעיינים בעסקאות זמינות ולוחצים "הצטרף". חלק מהעסקאות דורשות פיקדון מוחזר.</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">האם הפיקדון מוחזר?</h3>
              <p className="text-sm text-muted-foreground">כן. הפיקדון משמש להבטחת מחויבות ומוחזר במלואו לאחר השלמת העסקה או אם העסקה אינה יוצאת לפועל.</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">איך מבטלים חשבון?</h3>
              <p className="text-sm text-muted-foreground">שלחו אימייל ל-support@groupbuild.co.il עם בקשת מחיקה. נטפל בבקשה תוך 7 ימי עסקים.</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">האם השירות בתשלום?</h3>
              <p className="text-sm text-muted-foreground">השימוש באפליקציה חינמי לדיירים. עסקאות מסוימות דורשות פיקדון מוחזר בלבד.</p>
            </div>
          </div>
        </section>

        <section className="space-y-2 border-t pt-6">
          <h2 className="text-xl font-semibold">פרטי החברה</h2>
          <p className="text-sm text-muted-foreground">GroupBuild · ישראל</p>
          <p className="text-sm text-muted-foreground">אימייל: support@groupbuild.co.il</p>
        </section>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GroupBuild · <Link to="/privacy" className="hover:underline">מדיניות פרטיות</Link>
      </footer>
    </div>
  );
}
