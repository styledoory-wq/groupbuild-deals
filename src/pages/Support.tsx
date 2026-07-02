import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { useSupportWhatsapp } from "@/hooks/useSupportContact";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";

type Faq = { q: string; a: string };

const RESIDENT_FAQS: Faq[] = [
  { q: "מה זה GroupBuild?", a: "פלטפורמה לרכישות קבוצתיות לדיירים בפרויקטים חדשים — חיסכון משמעותי על מוצרים ושירותים לבית." },
  { q: "איך מצטרפים לעסקה?", a: "נכנסים לאפליקציה, בוחרים פרויקט וקטגוריה, מעיינים בעסקאות זמינות ולוחצים \"הצטרף\". חלק מהעסקאות דורשות פיקדון מוחזר." },
  { q: "האם הפיקדון מוחזר?", a: "כן. הפיקדון משמש להבטחת מחויבות ומוחזר במלואו לאחר השלמת העסקה או אם העסקה אינה יוצאת לפועל." },
  { q: "איך מבטלים חשבון?", a: "אפשר למחוק חשבון ישירות מהמסך \"החשבון שלי\", או לשלוח בקשה ל-support@groupbuild.co.il." },
  { q: "האם השירות בתשלום?", a: "השימוש באפליקציה חינמי לדיירים. עסקאות מסוימות דורשות פיקדון מוחזר בלבד." },
];

const SUPPLIER_FAQS: Faq[] = [
  { q: "איך מפרסמים הצעה חדשה?", a: "מהמסך \"ההצעות שלי\" לוחצים על \"הצעה חדשה\", בוחרים סוג הצעה, ממלאים את הפרטים בשלושה שלבים ומפרסמים." },
  { q: "איך מקבלים לידים מדיירים?", a: "לידים רלוונטיים מגיעים ל\"תיבת הביקושים\" שלך על פי הקטגוריות ואזורי השירות שהגדרת בפרופיל הספק." },
  { q: "מה זו רכישה קבוצתית ואיך זה עובד?", a: "הצעה מסוג רכישה קבוצתית מציגה מדרגות מחיר לפי כמות מצטרפים. ככל שיותר דיירים מצטרפים, כך המחיר יורד לכולם." },
  { q: "איך עורכים או משביתים הצעה קיימת?", a: "במסך \"ההצעות שלי\" לוחצים על ההצעה, ומשם ניתן לערוך תוכן, מחיר ואזורי שירות, או להעביר להצעה למצב לא-פעיל." },
  { q: "איך מקבלים אישור ספק?", a: "לאחר השלמת פרטי העסק והעלאת מסמכים, הצוות שלנו בודק את הפרטים ומאשר את החשבון בדרך כלל תוך 1–2 ימי עסקים." },
  { q: "איך מקבלים תשלום על עסקאות שנסגרו?", a: "התשלומים מרוכזים במסך \"הכנסות\", כולל פירוט עמלות הפלטפורמה ומועדי העברה." },
  { q: "מה קורה עם פיקדונות הדיירים?", a: "הפיקדונות מוחזקים בנאמנות עד להשלמת העסקה. עם הביצוע הפיקדון מקוזז מהתשלום, ובמקרה של ביטול מוחזר לדייר." },
  { q: "איך מקבלים תמיכה טכנית?", a: "אפשר לפנות בוואטסאפ או במייל support@groupbuild.co.il — צוות התמיכה מגיב בימי עסקים תוך 24 שעות." },
];

export default function Support() {
  const { user } = useApp();
  const initialAudience: "supplier" | "resident" = user?.role === "supplier" ? "supplier" : "resident";
  const [audience, setAudience] = useState<"supplier" | "resident">(initialAudience);

  const faqs = useMemo(() => (audience === "supplier" ? SUPPLIER_FAQS : RESIDENT_FAQS), [audience]);
  const waNumber = useSupportWhatsapp();
  const waUrl = normalizeWhatsappUrl(waNumber) ?? "https://wa.me/972526247941";

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

          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="border rounded-lg p-5 hover:bg-accent transition flex items-start gap-3">
            <MessageCircle className="text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">צ'אט מהיר עם הצוות</p>
              <p className="text-xs text-muted-foreground mt-1">א'-ה' 9:00-18:00</p>
            </div>
          </a>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <HelpCircle className="text-primary" /> שאלות נפוצות
            </h2>
            <div className="inline-flex rounded-full border p-1 bg-muted/40" role="tablist" aria-label="סוג משתמש">
              <button
                type="button"
                role="tab"
                aria-selected={audience === "resident"}
                onClick={() => setAudience("resident")}
                className={
                  "px-4 py-1.5 text-sm font-semibold rounded-full transition " +
                  (audience === "resident" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")
                }
              >
                לדיירים
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={audience === "supplier"}
                onClick={() => setAudience("supplier")}
                className={
                  "px-4 py-1.5 text-sm font-semibold rounded-full transition " +
                  (audience === "supplier" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")
                }
              >
                לספקים
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
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
