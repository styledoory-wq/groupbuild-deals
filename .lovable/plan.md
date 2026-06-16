
# מחשבון תקציב מקצועי – 4 מסלולים + AI

## מטרה
להחליף את `BudgetPlanner` הקיים במערכת חישוב מקצועית, גמישה ומבוססת נתונים, עם 4 מסלולי שימוש, AI שמלווה את החישוב (בלי להמציא מחירים), והצגת עסקאות רלוונטיות מ-GroupBuild שיכולות לחסוך כסף.

## חוויית משתמש
מסך כניסה אחד עם 4 כרטיסים:
1. **בנייה חדשה** – לבית פרטי/וילה
2. **שיפוץ בית מלא**
3. **שיפוץ חדר בודד** – מטבח, אמבטיה, שירותים, סלון, חדר שינה, מרפסת, ממ"ד, מחסן
4. **שירות בודד** – דלתות, מטבח, פרקט, ריצוף, צבע, גבס, אלומיניום, מיזוג, סולארי, גדרות, שערים, פרגולות, מצלמות, ריהוט, חשמל, אינסטלציה

לכל מסלול: טופס שאלות → תוצאה (מינ׳/ממוצע/מקס׳) + גרף חלוקת תקציב + טיפים מ-AI + עסקאות תואמות מ-GroupBuild.

## ארכיטקטורה

### Frontend
- מסך ראשי חדש: `src/pages/resident/BudgetPlanner.tsx` (החלפה מלאה)
- בורר מסלול: `src/components/budget/TrackSelector.tsx`
- 4 טפסים: `NewBuildForm.tsx`, `FullRenovationForm.tsx`, `SingleRoomForm.tsx`, `SingleServiceForm.tsx` תחת `src/components/budget/`
- תצוגת תוצאה: `BudgetResult.tsx` – טווחים, גרף עוגה/בר לפי קטגוריות, פירוט שורות
- צ'אט AI מובנה: `BudgetAIChat.tsx` – שאלות חסרות, הסברים, חיסכון
- מודול עסקאות תואמות: `MatchingDeals.tsx` – שולף עסקאות פעילות לפי קטגוריות שזוהו

### Backend (Edge Functions)
- `supabase/functions/budget-calculate/index.ts` – מקבל `{ track, inputs }`, מחזיר חישוב דטרמיניסטי לפי טבלאות מחירים מובנות (לא AI). מחזיר: `{ total: {min, avg, max}, categories: [{name, min, avg, max, unit}], assumptions: [], matched_categories: [] }`
- `supabase/functions/budget-assistant/index.ts` – צ'אט סטרימינג עם Lovable AI. **מקבל את תוצאת החישוב כקונטקסט** ומסביר/ממליץ בלבד – אסור להמציא מחירים. שימוש ב-`google/gemini-3-flash-preview`.
- `supabase/functions/budget-matching-deals/index.ts` – משתמש ב-`get_matching_deals_for_user` הקיימת + סינון לפי `matched_categories`.

### טבלאות מחירים (בקוד, לא DB)
`supabase/functions/_shared/pricingTables.ts` – טבלאות נתונים ניתנות לעריכה:
- בנייה חדשה: ₪/מ"ר לפי רמת גמר × אזור (צפון/מרכז/דרום/ירושלים/שרון) + מקדמים למרתף/ממ"ד/קומות
- חלוקה לקטגוריות באחוזים: שלד 28%, חשמל 6%, אינסטלציה 7%, אלומיניום 8%, ריצוף 9%, מטבח 6%, דלתות 3%, מיזוג 4%, צבע 3%, פיתוח חוץ 12%, תכנון ופיקוח 8%, בלת"מ 6%
- שיפוץ מלא: ₪/מ"ר לפי סוג × מקדמים לתשתיות/ריצוף/מטבח/דלתות/חלונות
- חדר בודד: טווחים פר חדר (מטבח 30-120K, אמבטיה 15-45K וכו')
- שירות בודד: יחידת מידה לכל שירות (דלת/מ"ר/יח׳) + טווח מחיר

טווחים: min = ממוצע × 0.8, max = ממוצע × 1.3 (ניתן לכיוון פר קטגוריה).

### AI Assistant – כללי ברזל (system prompt)
- "אתה יועץ תקציב. **אסור לך להמציא מחירים**. השתמש רק במספרים שמסופקים לך מהחישוב."
- תפקידים: לשאול נתונים חסרים, להסביר מה כלול/לא כלול, לזהות חריגות (למשל מטבח 200K ברמת בסיסי), להמליץ על חיסכון, להפנות לעסקאות GroupBuild רלוונטיות מתוך הרשימה שמועברת אליו.

### חיבור ל-GroupBuild
תחתית המסך אחרי חישוב:
> "העלות המשוערת היא ₪XX,XXX"
>
> 💡 עסקאות פעילות שיכולות לחסוך לך כסף:
> [כרטיס עסקה] · חיסכון פוטנציאלי: ₪X,XXX

מיפוי קטגוריות חישוב → `categories.slug` ב-DB.

## טכניקלי
- `MAX_TOKENS`/timeout מוגנים בכל edge function
- ולידציה עם Zod בכל endpoint
- שמירת חישובים אחרונים ב-`localStorage` (אין דרישה לשמירה ב-DB כרגע)
- RTL מלא, עיצוב תואם ל-design system הקיים (`#0A1F3D`, זהב `#D4AF37`)
- אייקונים מ-`lucide-react`
- גרף: `recharts` (אם לא מותקן – להוסיף)

## קבצים שיווצרו/יערכו
**חדש:**
- `src/components/budget/TrackSelector.tsx`
- `src/components/budget/NewBuildForm.tsx`
- `src/components/budget/FullRenovationForm.tsx`
- `src/components/budget/SingleRoomForm.tsx`
- `src/components/budget/SingleServiceForm.tsx`
- `src/components/budget/BudgetResult.tsx`
- `src/components/budget/BudgetAIChat.tsx`
- `src/components/budget/MatchingDeals.tsx`
- `src/lib/budgetTypes.ts`
- `supabase/functions/_shared/pricingTables.ts`
- `supabase/functions/budget-calculate/index.ts`
- `supabase/functions/budget-assistant/index.ts`
- `supabase/functions/budget-matching-deals/index.ts`

**יוחלף:**
- `src/pages/resident/BudgetPlanner.tsx` (מסך כניסה חדש עם 4 מסלולים)

**יוסר:**
- `supabase/functions/budget-planner/` (הפונקציה הישנה מבוססת ה-AI שמנחשת מחירים)

## הבהרות לפני שמתחילים
1. **טבלאות מחירים** – האם יש לך טבלת מחירים אמיתית/מקור נתונים שתרצה שאשתמש בו, או שאתחיל מטווחי שוק סטנדרטיים לישראל 2026 שתוכל לערוך מאוחר יותר בקובץ `pricingTables.ts`?
2. **ניהול מחירים מ-Admin** – האם תרצה בעתיד מסך אדמין לעריכת המחירים מה-DB (יוסיף עבודה משמעותית), או שמספיק שהם בקוד וניתן לעדכן ע"י עריכה?
3. **גרף** – עוגה (חלוקת תקציב) או עמודות (טווחים)? ברירת מחדל שלי: שניהם – עוגה לחלוקה + שורות עם bar chart לטווחים.
4. **AI Chat** – צ'אט פתוח לצד התוצאה, או רק כפתורים מוכנים ("מדוע המטבח כל כך יקר?", "איך לחסוך?")? ברירת מחדל: שילוב – כפתורים מהירים + שדה הקלדה חופשית.

אישור על הפלן + תשובות לארבע ההבהרות ואצא לדרך.
