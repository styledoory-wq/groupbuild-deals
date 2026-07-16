
# תוכנית: פיצול GroupBuild לשני Builds נפרדים ל־App Store

## עקרון מרכזי
נשמור **פרויקט Vite אחד** עם **קוד משותף מלא** (Supabase client, hooks, types, UI, utils). ההפרדה תתבצע ע"י משתנה סביבה `VITE_APP_MODE` שקובע בזמן build אילו routes/layouts/nav נטענים. **אין monorepo** — עודף מורכבות; אין כפילויות; אין נגיעה ב־Supabase.

Backend (Supabase, Storage, Auth, Edge Functions, Realtime) — **נשאר כפי שהוא, משותף לשלוש האפליקציות**.

---

## 1. מיפוי Routes קיימים (מתוך `src/App.tsx`)

### ציבורי (בכל ה־builds)
`/`, `/suppliers`, `/residents`, `/auth`, `/auth/supplier`, `/auth/resident`, `/onboarding`, `/reset-password`, `/thank-you`, `/unsubscribe`, `/terms/*`, `/suppliers/:id`, `/supplier/:slug`, `/category/:slug`, `/city/:citySlug/:categorySlug`, `/share/deal/:id`, `/privacy`, `/support`, `/browse`, `/categories`, `/categories/:id`, `/deals`, `/deals/:id`, `/search`

### דיירים (build residents בלבד)
`/resident`, `/resident/projects`, `/resident/categories*`, `/resident/project-management`, `/project/join/:token`, `/resident/deals*`, `/resident/favorites`, `/resident/budget-planner`, `/resident/profile*`, `/resident/delete-account`, `/resident/notifications`, `/resident/my-offers`, `/resident/documents`, `/resident/deposits`, `/resident/my-vouchers`, `/resident/demand*`, `/resident/demands`, `/resident/search`, `/resident/privacy`

### ספקים (build suppliers בלבד)
`/supplier`, `/supplier/onboarding`, `/supplier/profile/edit`, `/supplier/offers*`, `/supplier/marketing-*`, `/supplier/leads`, `/supplier/demand-inbox`, `/supplier/reviews`, `/supplier/scan`, `/supplier/redemptions`, `/supplier/revenue`, `/supplier/analytics`, `/supplier/account`, `/supplier/delete-account`

### אדמין (Web בלבד — לא ב־builds הניידים)
כל `/admin/*` + `/admin/login`

---

## 2. Components / Hooks / Utils משותפים
נשארים כפי שהם ב־`src/components/`, `src/hooks/`, `src/lib/`, `src/integrations/supabase/`, `src/types/`, `src/store/`. אין העברה, אין שכפול. נקודות שדורשות התאמה מינימלית:
- `BottomNav`, `DesktopSidebar` — כבר role-aware; יעבדו כמו שהם
- `Welcome.tsx` redirect — יכבד `APP_MODE`

---

## 3. מבנה קבצים חדש (שינויים בלבד)

```text
src/
  config/
    appMode.ts              ← NEW: קורא VITE_APP_MODE, מייצא APP_MODE
  routes/
    PublicRoutes.tsx        ← NEW: routes ציבוריים משותפים
    ResidentRoutes.tsx      ← NEW: כל /resident/*
    SupplierRoutes.tsx      ← NEW: כל /supplier/*
    AdminRoutes.tsx         ← NEW: כל /admin/*
  App.tsx                   ← UPDATED: טוען routes לפי APP_MODE
  pages/Welcome.tsx         ← UPDATED: redirect לפי APP_MODE
capacitor.config.residents.ts   ← NEW
capacitor.config.suppliers.ts   ← NEW
capacitor.config.ts             ← נשאר (default = residents לפיתוח)
.env.residents                  ← NEW: VITE_APP_MODE=residents
.env.suppliers                  ← NEW: VITE_APP_MODE=suppliers
package.json                    ← UPDATED: scripts build:residents / build:suppliers / cap:sync:*
ios/App/App-Residents/          ← NEW target (Bundle ID il.co.groupbuild.residents)
ios/App/App-Suppliers/          ← NEW target (Bundle ID il.co.groupbuild.suppliers)
```

### מנגנון הפיצול (App.tsx)
```ts
const mode = import.meta.env.VITE_APP_MODE ?? "web"; // "residents" | "suppliers" | "web"
// mode === "residents" → PublicRoutes + ResidentRoutes בלבד
// mode === "suppliers" → PublicRoutes + SupplierRoutes בלבד
// mode === "web"       → הכל כולל Admin (לדומיין admin.groupbuild.co.il והאתר הראשי)
```
מסכי ספקים לא ייכללו ב־bundle של דיירים כי `SupplierRoutes` פשוט לא ייובא (Vite tree-shakes).

---

## 4. Build & Bundle IDs

### פקודות build
```bash
# דיירים
VITE_APP_MODE=residents vite build --mode residents
npx cap sync ios --config capacitor.config.residents.ts

# ספקים
VITE_APP_MODE=suppliers vite build --mode suppliers
npx cap sync ios --config capacitor.config.suppliers.ts

# Web (כולל אדמין) — נשאר כרגע
VITE_APP_MODE=web vite build
```

### Capacitor configs
| קובץ | appId | appName |
|---|---|---|
| `capacitor.config.residents.ts` | `il.co.groupbuild.residents` | `GroupBuild` |
| `capacitor.config.suppliers.ts` | `il.co.groupbuild.suppliers` | `GroupBuild לעסקים` |

Icons + Splash: תיקיות נפרדות תחת `resources/residents/` ו־`resources/suppliers/` שיוזרמו ל־Xcode targets מתאימים.

### Supabase — משותף
שני ה־configs מצביעים על אותו `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` הקיימים. **לא נוגעים ב־Supabase**.

---

## 5. קבצים שדורשים שינוי (שלב 1)
1. `src/config/appMode.ts` — חדש
2. `src/routes/PublicRoutes.tsx`, `ResidentRoutes.tsx`, `SupplierRoutes.tsx`, `AdminRoutes.tsx` — חדשים (רק מעבירים JSX קיים מ־App.tsx)
3. `src/App.tsx` — refactor: מרכיב את הראוטים לפי `APP_MODE`
4. `src/pages/Welcome.tsx` — redirect לפי mode (residents build לא ינווט ל־/supplier ולהפך)
5. `src/components/layout/BottomNav.tsx` — מסנן את הפריטים לפי mode (הגנה כפולה)
6. `src/lib/routePreload.ts` — מדלג על preloads שלא רלוונטיים ל־mode

**אין מחיקת קוד, אין שינוי לוגיקה, אין נגיעה בעמודים עצמם.**

---

## 6. תוכנית מעבר בשלבים

### שלב 1 — הפרדת routes/layouts/nav (ללא שינוי UX)
- יצירת `appMode.ts` + 4 קובצי routes
- Refactor `App.tsx` להרכיב לפי mode
- ברירת מחדל: `VITE_APP_MODE=web` (הכל עובד כפי שהיה)
- הגנת role guards קיימת נשמרת (`residentRoute`, `supplierRoute`, `adminRoute`)
- **בדיקה:** האתר הנוכחי + Preview עובדים בדיוק כמו לפני

### שלב 2 — Build modes + Capacitor
- `.env.residents`, `.env.suppliers`
- שני קבצי `capacitor.config.*.ts`
- npm scripts: `build:residents`, `build:suppliers`, `cap:sync:residents`, `cap:sync:suppliers`
- Icons + Splash לכל אפליקציה
- Xcode: יצירת שני targets (הוראות למשתמש — Xcode לא נגיש מ־Lovable)

### שלב 3 — QA
- הרשמה/התחברות בכל build
- העלאת תמונה מספק → הופעה אצל דייר ואדמין (אימות ש־Storage משותף)
- יצירת בקשה מדייר → הופעה אצל ספק
- Realtime, Deep links, Push
- TestFlight לשני ה־builds

---

## 7. איך נמנעת כפילות קוד
- **UI, hooks, lib, types, Supabase client** — שכבה אחת ויחידה ב־`src/`
- Routes files מכילים רק `<Route>` — לא לוגיקה
- אין העתקת עמודים
- Tree-shaking של Vite מסיר קוד לא-בשימוש מ־bundle

---

## 8. מה לא נעשה
- לא ניצור Supabase/Storage/DB חדש
- לא נשנה schema או RLS
- לא נגע ב־SEO של האתר הציבורי (`/`, `/city/*`, `/category/*`, `/suppliers/*` נשארים ב־web build)
- לא נמחק את מסכי האדמין — הם רק לא ייטענו ב־mobile builds
- לא ניצור monorepo

---

## שאלה לפני התחלה
לאשר את התוכנית ואתחיל **שלב 1** (הפרדת routes ללא שינוי התנהגות). שלבים 2–3 דורשים גישה ל־Xcode/Apple Developer שאבצע כהוראות מודרכות למשתמש כשנגיע לשם.
