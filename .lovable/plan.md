
# הפיכת GroupBuild לאינדקס ספקים ציבורי

מטרה: להפוך את GroupBuild ממערכת סגורה למנוע חיפוש ציבורי בתחום הבנייה והשיפוצים, עם עמודי SEO, אנליטיקס וחיפוש גלובלי חכם — בלי לשבור את המערכת הקיימת לתושבים/ועדים/ספקים.

---

## שלב 1 — תשתית ציבורית + SEO (בסיס להכל)

### 1.1 מסד נתונים
- הוספת עמודת `slug` (טקסט, unique) לטבלת `suppliers` — עם generator שמייצר slug באנגלית מהשם העברי (translit + fallback ל־`supplier-{shortid}`).
- הוספת עמודת `slug` (טקסט, unique) לטבלת `categories` (כבר חלקית קיים).
- Backfill לכל הספקים/הקטגוריות הקיימים.
- Trigger שממלא slug אוטומטית ביצירת ספק חדש.
- עדכון RLS: policy ציבורי (`anon` + `authenticated`) לקריאת ספקים פעילים ומאושרים בלבד, וקריאה מלאה של `categories`, `supplier_gallery`, `reviews` (רק מאושרות), `deals` (רק active).

### 1.2 ראוטים ציבוריים חדשים (מחוץ ל־`/resident`)
- `/category/:slug` — דף קטגוריה ציבורי
- `/supplier/:slug` — כרטיס ספק ציבורי
- `/search?q=...` — תוצאות חיפוש ציבוריות
- דפים אלו נגישים ללא התחברות; header ציבורי עם CTA "הרשמה/התחברות".

### 1.3 SEO per-route
- התקנה של `react-helmet-async` (אם עוד לא) + HelmetProvider.
- לכל דף ספק: `<title>`, `meta description`, `canonical`, `og:*`, JSON-LD `LocalBusiness` (שם, טלפון, אזורים, דירוג).
- לכל דף קטגוריה: JSON-LD `ItemList` של הספקים.
- עדכון `scripts/generate-sitemap.ts` שיושך את כל הקטגוריות והספקים הפעילים מה־DB.
- `robots.txt` — מאפשר את כל הדפים הציבוריים, חוסם `/admin`, `/supplier/dashboard`, `/resident` (פרטי).

---

## שלב 2 — כרטיס ספק ציבורי (`/supplier/:slug`)

תצוגה מלאה: לוגו, קאבר, שם, תיאור, תחומי התמחות, אזורי שירות, שעות פעילות, טלפון, WhatsApp, אתר, גלריה, מבצעים פעילים, ביקורות + דירוג.

כפתורי פעולה (כולם עם event tracking):
- 📞 התקשר → `tel:`
- 💬 WhatsApp → `wa.me`
- 🌐 אתר → פתיחה בטאב חדש
- 🧭 ניווט → Google Maps / Waze
- ⭐ שמור למועדפים → **דורש הרשמה** (מציג bottom-sheet הרשמה מהירה)
- 🚀 "פתח פרויקט לקבלת הצעות" → **דורש הרשמה**

Guest gating: hook `useGuestGate()` שמציג sheet של הרשמה מהירה במקום ניווט למסך חסום.

---

## שלב 3 — Analytics (Event Tracking)

### 3.1 טבלה חדשה: `supplier_analytics_events`
עמודות רלוונטיות: `supplier_id`, `event_type` (view / call / whatsapp / website / navigate / open_project / favorite_attempt), `session_id` (anon uuid ב־localStorage), `user_id` (nullable), `referrer`, `page_url`, `utm_*`.
- GRANT `INSERT` ל־`anon` + `authenticated` בלבד. SELECT רק לספק עצמו ולאדמין.

### 3.2 קליינט
- `src/lib/analytics.ts` עם `trackEvent(type, supplierId, meta?)`.
- Batching + `navigator.sendBeacon` ליציאה.
- הזרקה בכל כפתורי כרטיס הספק ובצפיות דף (`useEffect` על mount).

### 3.3 חיפושים שלא נמצאו
- טבלה `search_queries` שמתעדת כל חיפוש: `query`, `results_count`, `session_id`, `user_id?`.

---

## שלב 4 — חיפוש גלובלי במסך הבית

- קומפוננטת `GlobalSearchBar` שמופיעה במסך הראשי (Landing + Index) ובכל header ציבורי.
- שימוש בפונקציית `search_catalog` הקיימת + הרחבה `search_global` שמחזירה גם:
  - קטגוריות
  - תתי־קטגוריות
  - ספקים (לפי שם + תיאור + תחומים + אזורים)
  - מבצעים פעילים
- תמיכה בשאילתות טבעיות: "חשמלאי בצפת" → parsing של קטגוריה + עיר.
- דף תוצאות `/search?q=...` עם טאבים: הכל / קטגוריות / ספקים / מבצעים.
- Autocomplete בזמן אמת (debounce 220ms).

---

## שלב 5 — Dashboard לספק (סטטיסטיקות)

הוספה ל־`SupplierDashboard`:
- קלפי KPI: צפיות (שבוע/חודש), קליקים לטלפון, ל־WhatsApp, לאתר, פתיחות פרויקט.
- מקורות תנועה: חיפוש פנימי, Google (מ־`referrer`).
- גרף מגמות 30 יום.
- שאילתות aggregated דרך view/RPC על `supplier_analytics_events`.

## שלב 6 — Dashboard לאדמין

הוספה ל־`AdminDashboard`:
- הקטגוריות הכי מחופשות (top 20).
- הספקים הכי נצפים.
- הכי הרבה שיחות/WhatsApp/פתיחות פרויקט.
- חיפושים ללא תוצאות → הזדמנויות להוספת קטגוריות/ספקים.

---

## פרטים טכניים

**קבצים חדשים עיקריים:**
```text
src/pages/public/CategoryPublic.tsx
src/pages/public/SupplierPublic.tsx
src/pages/public/SearchPublic.tsx
src/components/public/PublicHeader.tsx
src/components/public/GlobalSearchBar.tsx
src/components/public/GuestActionSheet.tsx
src/hooks/useGuestGate.ts
src/lib/analytics.ts
src/lib/slugify.ts
src/components/seo/SupplierJsonLd.tsx
src/components/seo/CategoryJsonLd.tsx
src/pages/supplier/dashboard/AnalyticsCards.tsx
src/pages/admin/AdminInsights.tsx
```

**מיגרציות SQL:**
1. `slug` + backfill + trigger ל־suppliers/categories.
2. RLS ציבורי לקריאה על suppliers/categories/gallery/reviews/deals.
3. טבלת `supplier_analytics_events` + טבלת `search_queries` + GRANTs + policies.
4. RPCs: `search_global`, `supplier_stats(supplier_id, days)`, `admin_insights()`.

**עדכונים:**
- `src/App.tsx` — הוספת ראוטים ציבוריים חדשים.
- `scripts/generate-sitemap.ts` — משיכת slugs מ־DB.
- `index.html` + `HelmetProvider` ב־main.
- `public/robots.txt` — פתיחת דפים ציבוריים.

**מה נשאר סגור להתחברות בלבד:**
פתיחת פרויקט, קבלת הצעות, הצטרפות לרכישה קבוצתית, שמירת מועדפים, כל אזור `/resident`, `/admin`, dashboard ספק.

---

## סדר ביצוע מוצע

1. שלב 1 (SQL slugs + RLS ציבורי + ראוטים + SEO תשתית)
2. שלב 2 (כרטיס ספק ציבורי + guest gating)
3. שלב 4 (חיפוש גלובלי — הכי גבוה בערך עבורך)
4. שלב 3 (Analytics — תשתית לפני dashboardים)
5. שלב 5 + 6 (dashboardים)

כל שלב ניתן ל־QA עצמאי ולא שובר את הקיים.

**אישור?** אתחיל בשלב 1 מיד כשתאשר.
