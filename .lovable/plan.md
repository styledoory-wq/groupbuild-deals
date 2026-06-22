
# שדרוג חוויית האדמין למערכת SaaS מקצועית

המטרה: לעבור מאוסף 20 מסכים מפוזרים למבנה ניהול ברור בסגנון Monday / Stripe / Linear — עם טבלאות עשירות, מידע עסקי, ופחות כרטיסים ריקים.

## מבנה חדש (7 מקטעים בלבד בניווט)

```text
🏠 דשבורד        → /admin
🏗 פרויקטים      → /admin/projects
👥 ספקים         → /admin/suppliers
🎁 הצעות         → /admin/deals
💳 תשלומים       → /admin/payments      (איחוד פיקדונות + הגדרות תשלום)
⚠️ בקרה          → /admin/control       (חדש)
⚙️ הגדרות        → /admin/settings      (מאחד: קטגוריות, אזורים, שלבים, משתמשים, תלונות, ועדים)
```

מסכים קיימים שיוטמעו תחת ההגדרות / שאר המקטעים (לא יוסרו, רק יוסתרו מהניווט הראשי):
Categories, Regions, ProjectStages, Users, Complaints, CommitteeRequests, SupplierTrust, SupplierAreas, SupplierMedia, Stats, Leads.

## שינויים לפי מסך

### 1. דשבורד (`AdminDashboard`)
שורת KPI אחת נקייה: מחזור חודשי · משתמשים · ספקים · הצעות פעילות · פיקדונות · לידים · % המרה.
מתחת — שני טורים: פעילות אחרונה (feed) + משימות לטיפול (קישור ישיר ל/admin/control).
גרף מחזור עדין אחד בלבד (sparkline/area), בלי הכרטיסים הצבעוניים הכפולים.

### 2. ספקים (`AdminDbSuppliers`)
החלפת כרטיסים בטבלת ניהול: שם · הצעות · לידים · הכנסות · סטטוס · פעולות (ערוך / אזורים / מדיה / השעה).
חיפוש + מיון + פילטר סטטוס בראש. ללא KPI cards למעלה.

### 3. פרויקטים (`AdminProjects`)
כרטיסי פרויקט עשירים ברשת: תמונה · #דירות · משתמשים · ספקים · הצעות פעילות · פיקדונות · שלב/סטטוס. תצוגת רשימה/רשת.

### 4. הצעות (`AdminDeals`)
טבלה מקצועית: ספק · פרויקט · מצטרפים · הכנסות · סטטוס · פעולות. מסנני סטטוס+פרויקט+ספק.

### 5. תשלומים (חדש — `AdminPayments`)
איחוד `AdminDeposits` + `AdminPaymentSettings` לטאבים: פיקדונות / יומן ניסיונות / הגדרות סליקה.

### 6. בקרה (חדש — `AdminControl`)
מסך "כל מה שדורש טיפול" — לוח רשימות חכמות, כל אחת עם ספירה + טבלה + פעולה ישירה:
- ספקים ללא הצעות
- הצעות ללא תמונה
- תשלומים שנכשלו (מתוך deposit_attempt_logs)
- ספקים שממתינים לאישור
- לידים ללא מענה (deal_interests/supplier_inquiries ישנים ללא טיפול)
- פרויקטים ללא פעילות (אין הצעות פעילות / משתמשים)
- תלונות פתוחות

### 7. הגדרות (`AdminSettings`)
דף עם טאבי משנה: כללי · קטגוריות · אזורים · שלבי פרויקט · משתמשים · תלונות · בקשות ועד · אמון ספקים.

## עיצוב — אחיד לכל מסכי האדמין

- `AdminPageHeader` משותף: כותרת + תיאור + פעולות.
- `AdminTable` משותף (מבוסס shadcn Table): כותרות דקות, hover, zebra עדין, אייקוני פעולה בקצה.
- צבעי סטטוס מצומצמים (3 בלבד): ירוק/ענבר/אדום. שאר הטקסט בנייטרל.
- ללא צללים כבדים, ללא גרדיאנטים. ריווח נדיב (px-6 py-4), max-w-7xl.
- ניווט דסקטופ: סיידבר 7 פריטים. מובייל: bottom nav 5 (דשבורד/פרויקטים/הצעות/בקרה/עוד).

## שינויי קוד

- חדש: `src/pages/admin/AdminControl.tsx`, `src/pages/admin/AdminPayments.tsx`.
- חדש: `src/components/admin/AdminPageHeader.tsx`, `src/components/admin/AdminTable.tsx`, `src/components/admin/AdminKpiRow.tsx`.
- עדכון `DesktopSidebar` + `BottomNav` ל-7/5 פריטי האדמין החדשים.
- עדכון `App.tsx` — הוספת רוטים `/admin/payments`, `/admin/control`; הפניית `/admin/deposits` ו-`/admin/payment-settings` ל-`/admin/payments`.
- שכתוב `AdminDashboard`, `AdminDbSuppliers`, `AdminProjects`, `AdminDeals` לשימוש ברכיבים המשותפים ובטבלאות החדשות.
- `AdminSettings` הופך לעמוד-מעטפת עם טאבים שמרנדרים את העמודים הקיימים (Categories/Regions/Stages/Users/Complaints/Committee/Trust) כסאב-קומפוננטות, בלי לאבד פונקציונליות.

## מחוץ לסקופ
- שינויי סכמה/RLS — אין. כל המידע למסך הבקרה נשלף בשאילתות מהטבלאות הקיימות.
- צד הספק והדייר — לא משתנה.

מאשר ואני מתחיל לבנות?
