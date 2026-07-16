# Refactor מערכת האדמין

## עקרונות מנחים
- **3 שניות להבנה**: כל מסך עונה על "מה קורה עכשיו? מה דורש טיפול?"
- **פחות ויותר**: פחות כרטיסים, יותר white space, פחות צבעים, יותר היררכיה
- **Action-first**: כל מסך = דשבורד ממוקד + טבלה נקייה + סינון חכם
- **Badges בתפריט** במקום מסך "בקרה" נפרד

## שפת עיצוב חדשה (Design System אדמין)
- רקע: `#F7F8FA` (אפור-תכלת עדין), כרטיסים `#FFFFFF`
- פינות `rounded-[16px]`, הצללה עדינה מאוד: `shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.03)]`
- גבולות: `border-[#EEF0F4]` (יותר עדין מהקיים)
- טיפוגרפיה: כותרות `text-[22px] font-bold tracking-tight`, גוף `text-[13px]`
- צבע יחיד לפעולות: `#0E6B5A` (הירוק הקיים). אדום/כתום רק ל-alerts אמיתיים.
- אייקונים: `strokeWidth={1.75}` (עדין יותר מהקיים 2.2)
- מרווחים: `p-6 lg:p-8`, `gap-4`, בין sections `space-y-8`
- אנימציה: `transition-all duration-200 ease-out` על כל interactive
- Glass effect: `backdrop-blur-xl bg-white/70` על sticky headers בלבד

## שינויים מבניים

### 1. דשבורד חדש (`AdminDashboard.tsx` — כתיבה מחדש)
```
┌─ Header: "שלום, [שם]" · תאריך · כפתור פעולה מהירה
├─ ATTENTION PANEL (הבלוק המרכזי — אם יש משהו)
│   רק פריטים דורשי-טיפול, כל שורה clickable → מסך יעד
├─ 4 KPI cards שקטים: ספקים חדשים · הצעות פעילות · פרויקטים פעילים · לידים חדשים
│   (מספר בלבד + delta קטן, ללא גרפים)
└─ Recent Activity: 8 שורות אחרונות (feed נקי)
```
מוסר: גרפים, נתוני הכנסה, פיקדונות, אחוזי המרה, סטטיסטיקות מפורטות → עוברים ל-`AdminStats`.

### 2. Attention Panel (קומפוננטה חדשה)
`src/components/admin/AttentionPanel.tsx` — שואב את הלוגיקה הקיימת מ-`AdminControl` אבל מציג רק פריטים עם `count > 0`, בעיצוב שקט: איקון עגול קטן + כותרת + מספר, בלי טונים דרמטיים. clickable rows.

### 3. Sidebar Badges (חדש)
`src/components/layout/BottomNav.tsx` + כל תפריט אדמין: hook `useAdminAttentionCounts()` שמחזיר `{suppliers, deals, complaints, leads, committee}`. Badge קטן אדום עם מספר ליד פריט התפריט. מבטל את הצורך במסך "בקרה" — `AdminControl` נמחק, ה-route משכתב redirect ל-dashboard.

### 4. מסכי משנה — Mini Dashboard בכל מסך
לכל אחד מ:
- **Suppliers** (`AdminDbSuppliers`): Tabs עליונים — פעילים · ממתינים · לא מאושרים · חדשים השבוע
- **Deals** (`AdminDeals`): Tabs — פעילות · טיוטות · ללא תמונה · הסתיימו
- **Projects** (`AdminProjects`): Tabs — פעילים · חדשים · הסתיימו

קומפוננטה משותפת חדשה: `src/components/admin/AdminTabsBar.tsx` — tabs עם counts, סגנון Linear-like.

### 5. הגדרות (`AdminSettings.tsx`) — קיבוץ מחדש
3 קבוצות בלבד:
- **תוכן**: קטגוריות · תחומי פרויקט · אזורי שירות
- **משתמשים**: משתמשים · דיירים · לידים · בקשות ועד · תלונות
- **מערכת**: התראות · תמיכה · הודעות מוכנות · סטטיסטיקות · אמון ספקים · פיצ׳רים בטא

מוסר את "קטגוריות (ישן)" מהתפריט (deprecated).

### 6. Header אדמין אחיד
`AdminPageHeader.tsx` — עדכון: פחות border, יותר breathing, כותרת גדולה יותר (`28px`), תיאור בגוון `#8B94A3`. sticky עם glass ברגע שמלגללים.

## קבצים לשינוי
- **חדש**: `src/components/admin/AttentionPanel.tsx`, `AdminTabsBar.tsx`, `src/hooks/useAdminAttention.ts`
- **כתיבה מחדש**: `src/pages/admin/AdminDashboard.tsx`, `AdminSettings.tsx`, `AdminPageHeader.tsx`
- **עדכון tabs**: `AdminDbSuppliers.tsx`, `AdminDeals.tsx`, `AdminProjects.tsx`
- **עדכון**: `src/components/layout/BottomNav.tsx` (badges)
- **מחיקה/redirect**: `AdminControl.tsx` → redirect ל-dashboard
- **אין שינויי DB, אין שינויי לוגיקה עסקית** — רק presentation/UX.

## מה לא ייכלל בשלב זה
- שינויי backend/schema
- שינוי לוגיקת הרשאות
- שינוי מסכי resident/supplier
- שינוי תוכן העמודים הפנימיים (רק tabs + header החדש)

## הערכת גודל
~8-10 קבצים חדשים/משוכתבים, 4-5 קבצים בעדכון tabs. עבודה בפעימה אחת.

---

**אישור להתחיל?** אם יש חלק שאתה רוצה לדלג עליו או לשנות (למשל להשאיר את מסך הבקרה, או להוסיף Analytics עמוד חדש במקום להעביר ל-AdminStats) — תגיד עכשיו.
