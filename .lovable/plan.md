
# רה-ארגון אזור הספק

מטרה: חוויית SaaS מודרנית (Stripe/Linear), מיקוד בפעולות שמייצרות כסף, אחידות בין מסכים, פחות עומס.

## 1. ניווט תחתון חדש (5 טאבים)

מ-`BottomNav.tsx` + `DesktopSidebar.tsx`:

| טאב | אייקון | נתיב |
|---|---|---|
| בית | Home | `/supplier` |
| לידים | Users | `/supplier/leads` |
| הצעות | Briefcase | `/supplier/offers` |
| הכנסות | TrendingUp | `/supplier/revenue` (חדש) |
| חשבון | User | `/supplier/account` (חדש) |

**הסרה מהניווט**: סריקה, מימושים.
**FAB גלובלי**: כפתור צף עגול בפינה (מעל ה-BottomNav) עם אייקון ScanLine שמנווט ל-`/supplier/scan` - מוצג בכל מסכי הספק.

## 2. דף הבית (`SupplierDashboard.tsx`) - שכתוב מלא

מבנה חדש (3 בלוקים בלבד):

### א. כרטיס מרכז פעולות (Action Center)
כרטיס יחיד בראש המסך עם 4 שורות:
- לידים חדשים: N
- הצעות שממתינות לטיפול: N
- הצעות שעומדות להסתיים: N
- לקוחות שלא קיבלו מענה: N

כפתור CTA יחיד: "לטפל עכשיו" → מנווט ללידים/הצעות לפי המספר הדחוף ביותר.

### ב. ההצעה המובילה
כרטיס אחד בלבד (ההצעה הפעילה עם הכי הרבה מצטרפים):
- תמונה גדולה
- שם + מחיר נוכחי
- מצטרפים (X מתוך Y)
- progress bar
- הכנסה צפויה ₪

### ג. פעילות אחרונה (Timeline)
רשימה פשוטה של 5-7 אירועים אחרונים: ליד / הצטרפות / מימוש / הודעה. ללא כרטיסים נפרדים - שורות בלבד עם dot+טקסט+זמן.

**הסרה מ-Dashboard**: כל הכרטיסים הקיימים של סטטיסטיקות מרובות, גרפים, ביצועי השבוע במצבם הנוכחי.

### ד. ביצועי השבוע (כרטיס יחיד בתחתית)
4 מספרים בשורה אחת: צפיות / לידים / הצטרפויות / הכנסה צפויה.

### ה. רצועות אינסייט (אופציונלי, שורות דקות)
- "חסכת ללקוחות ₪42,350"
- "ציון איכות הצעה: 92/100 - הוסף תמונה נוספת"

## 3. דף לידים (`SupplierLeads.tsx`) - CRM אמיתי

טאבי סטטוס בראש: חדשים / בטיפול / הצעה נשלחה / נסגר / לא רלוונטי.

ללא גרפים. ללא סטטיסטיקות.

כרטיס ליד נקי:
- שם + טלפון
- שם פרויקט
- זמן כניסה (יחסי: "לפני 2 שעות")
- Badge סטטוס
- 2 כפתורי פעולה: חיוג 📞 / וואטסאפ 💬

## 4. דף הצעות (`SupplierOffers.tsx`) - ניקוי כפילויות

בראש: כרטיס סיכום אחד עם 3 מספרים בלבד:
- הכנסה פוטנציאלית ₪
- מצטרפים (סה"כ)
- הצעות פעילות

מתחת: רשימת הצעות כפי שקיים, אבל ללא הסטטיסטיקות הכפולות שמופיעות גם בדשבורד.

## 5. דף הכנסות (חדש - `SupplierRevenue.tsx`)

מאחד את `SupplierRedemptions.tsx` + נתוני הכנסות מהדשבורד:
- כרטיס סיכום: סה"כ הכנסות / מימושים
- גרף הכנסות חודשי
- רשימת עסקאות/מימושים אחרונים

**חשוב**: להסיר כל הצגה של נתוני הכנסות מהמסכים האחרים (Dashboard, Offers).

## 6. דף חשבון (חדש - `SupplierAccount.tsx`)

מסך הגדרות מרוכז עם רשימה (list rows) של:
- פרטי עסק → `/supplier/profile/edit`
- מנוי
- הגדרות
- התראות → `/notifications-settings`
- תמיכה
- יציאה (כפתור אדום בתחתית)

## 7. FAB סריקה גלובלי

קומפוננטה חדשה: `src/components/supplier/ScanFAB.tsx`
- כפתור עגול 56px, צבע primary, מעל ה-BottomNav (bottom: 90px)
- אייקון ScanLine
- מוצג רק כשהמשתמש בנתיב `/supplier*` ולא בעצמו ב-`/supplier/scan`
- מותקן ב-`MobileShell.tsx`

## 8. שפת עיצוב אחידה

טוקנים שיופעלו על כל מסכי הספק:
- רקע: `bg-background` (נקי)
- כרטיסים: `rounded-2xl bg-card border border-border/40` ללא צל / צל עדין `shadow-sm` בלבד
- ריווח חיצוני: `px-4 py-6 space-y-4`
- כותרות סקציה: `text-base font-semibold text-foreground` + תווית עדינה מתחת
- בלי מסגרות צבעוניות חזקות, בלי גרדיאנטים מרובים, צבע אקצנט אחד (primary)
- אייקונים: lucide בגודל אחיד 18-20px
- טיפוגרפיה: 3 רמות בלבד (כותרת ראשית 24, כותרת סקציה 16, גוף 14)

## פירוט טכני (לקוראים טכניים)

### קבצים חדשים
- `src/pages/supplier/SupplierRevenue.tsx`
- `src/pages/supplier/SupplierAccount.tsx`
- `src/components/supplier/ScanFAB.tsx`
- `src/components/supplier/ActionCenterCard.tsx`
- `src/components/supplier/TopOfferCard.tsx`
- `src/components/supplier/ActivityTimeline.tsx`
- `src/components/supplier/WeekStatsCard.tsx`

### קבצים שעוברים שכתוב מלא
- `src/pages/supplier/SupplierDashboard.tsx`
- `src/pages/supplier/SupplierLeads.tsx`
- `src/pages/supplier/SupplierOffers.tsx` (ניקוי בלבד)
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/DesktopSidebar.tsx`
- `src/components/layout/MobileShell.tsx` (להוסיף ScanFAB)
- `src/App.tsx` (routes חדשים)

### Routes חדשים ב-App.tsx
- `/supplier/revenue` → SupplierRevenue
- `/supplier/account` → SupplierAccount
- `/supplier/scan` ו-`/supplier/redemptions` נשארים נגישים (FAB / מתוך הכנסות) אבל יוצאים מהניווט הראשי.

### מקורות נתונים
שימוש בקיים: `AppStore` (deals, leads, profile) + שאילתות Supabase שכבר קיימות במסכים. אין שינוי סכמה.

### ציון איכות הצעה
חישוב client-side פשוט בקובץ עזר חדש `src/lib/dealQualityScore.ts`:
- תמונה: 25
- תיאור (>50 תווים): 20
- מחיר מלא: 15
- מצטרפים > 0: 20
- זמן תגובה (placeholder = 20 קבוע כרגע)
מחזיר ציון + המלצה אחת לפעולה הבאה.

## סדר ביצוע
1. ניווט (BottomNav, DesktopSidebar, App routes, ScanFAB)
2. SupplierAccount + SupplierRevenue (מסכים חדשים)
3. SupplierDashboard - שכתוב
4. SupplierLeads - שכתוב
5. SupplierOffers - ניקוי
6. אימות build + ניווט ידני
