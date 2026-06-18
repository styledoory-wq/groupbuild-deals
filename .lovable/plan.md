
# מסלולי משתמש מותאמים (User Journeys)

היום הדשבורד של הדייר מציג תמיד את 8 השלבים של בנייה חדשה (`STAGE_THEMES`). זה לא מתאים למי שמשפץ או קונה משהו נקודתי, ולוועד בית בוודאי לא.

## ארבעת המסלולים

| מסלול | מה הוא רואה |
|---|---|
| **בנייה חדשה** (`new_build`) | כל 8 השלבים — כמו היום |
| **שיפוץ כללי** (`renovation`) | תת־סט: הריסה/בינוי קל · מערכות · פתחים · גמרים · מטבח/אמבטיה · ריהוט |
| **רכישה נקודתית** (`single_purchase`) | בלי שלבים בכלל — חיפוש חופשי + קטגוריות + עסקאות מומלצות |
| **ועד בית** (`committee`) | דשבורד ועד הקיים, ללא שלבים |

> *שלבי השיפוץ הם הצעה — קל לכוונן אחרי שנראה את זה חי.*

## איפה זה נבחר
- **באונבורדינג** — צעד אחד אחרי הרשמה: כרטיסיות עם 4 המסלולים (ברירת מחדל: בנייה חדשה למי שכבר רשום ללא מסלול).
- **בעריכת פרופיל** (`ResidentProfileEdit`) — שדה ניתן לשינוי בכל רגע.

## איך זה משפיע על ה־UI

### `ResidentDashboard`
- אם `journey = single_purchase` — הסטריפ של השלבים מוסתר לגמרי; במקומו מוצג בלוק "חפש קטגוריה" + עסקאות מומלצות.
- אם `journey = renovation` — הסטריפ מסונן לתת־הסט הרלוונטי.
- אם `journey = new_build` — ללא שינוי מהיום.
- אם `journey = committee` — redirect ל-`/committee`.

### סינון עסקאות
- ה־RPC `get_matching_deals_for_user` כבר תומך ב-`_stage_filter`. כשהמסלול הוא `single_purchase` — לא נשלח פילטר. כששיפוץ — נשלח רק שלבים מהתת־סט.

## שינויים טכניים

**DB (migration אחד):**
- `app_journey` enum: `new_build | renovation | single_purchase | committee`
- `profiles.journey app_journey` (default: `new_build` למשתמשים קיימים)

**קוד:**
- `src/lib/designSystem.ts` — קבועי `JOURNEY_STAGES: Record<Journey, StageId[]>`.
- `src/lib/journeys.ts` (חדש) — מטא־דאטה למסלולים (label, icon, description, default stages).
- `src/pages/resident/ResidentProfileEdit.tsx` — שדה בחירת מסלול.
- `src/pages/resident/ResidentDashboard.tsx` — לקרוא `journey` ולסנן/להחביא את הסטריפ.
- `src/pages/Auth.tsx` או צעד אונבורדינג נפרד — בחירת מסלול אחרי הרשמה (אם אין `journey`).

## מה לא משתנה (בשלב הזה)
- אין שינוי במסלול של ועד בית (`CommitteeDashboard`) — הוא ממילא לא מציג שלבים.
- אין שינוי בצד הספק.
- אין שינוי בעסקאות / קטגוריות עצמן.

---

**אישור?** אם כן — אני בונה את ה־migration + הקוד ברצף אחד. אם תרצה לדייק את שלבי השיפוץ לפני כן, שלח את הרשימה שלך.
