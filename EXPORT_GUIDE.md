# GroupBuild Lux — חבילת ייצוא מלאה

מדריך זה מסביר איך להריץ את הפרויקט מחוץ ל-Lovable (לוקאלי + פריסה ל-Vercel/Netlify) מול Supabase אמיתי.

---

## 1. מה כלול בחבילה

```
/
├── src/                    # כל קוד ה-Frontend (React + Vite + TS + Tailwind)
├── public/                 # נכסים סטטיים
├── supabase/
│   ├── config.toml         # קונפיג פרויקט Supabase
│   ├── migrations/         # כל מיגרציות ה-SQL לפי סדר כרונולוגי
│   └── functions/          # Edge Functions (Deno)
│       ├── admin-create-resident/
│       ├── create-deposit/
│       ├── notify-admin/
│       └── payment-webhook/
├── package.json            # תלויות frontend
├── vite.config.ts          # קונפיג Vite
├── tailwind.config.ts      # design tokens
├── tsconfig*.json
├── index.html
└── EXPORT_GUIDE.md         # הקובץ הזה
```

---

## 2. סטאק טכנולוגי

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind v3, shadcn/ui, React Router v6, TanStack Query, Framer Motion
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions/Deno)
- **שפה**: עברית, RTL מלא
- **תשלומים**: שלד מוכן ל-Grow / Cardcom (webhook קיים)

---

## 3. הגדרת Supabase מאפס

### א. צור פרויקט חדש ב-Supabase
1. היכנס ל-https://supabase.com → New Project
2. שמור את:
   - `Project URL` (לדוגמה `https://xxxx.supabase.co`)
   - `anon public key`
   - `service_role key` (סודי — רק ל-Edge Functions)

### ב. הרץ את כל המיגרציות
יש שתי אפשרויות:

**אפשרות 1 — Supabase CLI (מומלץ):**
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

**אפשרות 2 — ידני דרך SQL Editor:**
פתח את כל הקבצים בתיקייה `supabase/migrations/` לפי סדר השם (כרונולוגי) והרץ אחד-אחד ב-SQL Editor.

### ג. צור Storage Buckets
ב-Supabase Dashboard → Storage → New bucket. צור 3 buckets **public**:
- `supplier-logos`
- `supplier-gallery`
- `supplier-catalogs`

הוסף Storage policies — דוגמה לכל bucket (SELECT לכולם, INSERT/UPDATE/DELETE לבעלים בלבד):
```sql
CREATE POLICY "Public read supplier-logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'supplier-logos');

CREATE POLICY "Authenticated upload supplier-logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-logos');

CREATE POLICY "Owners update supplier-logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
```
(שכפל ל-`supplier-gallery` ו-`supplier-catalogs`)

### ד. הגדרות Auth
ב-Authentication → Providers:
- אפשר **Email** (אפשר להפעיל Confirm email לפי הצורך)
- אפשר **Google** (תצטרך OAuth Client ID + Secret מ-Google Cloud Console)
- ב-URL Configuration → Site URL: כתובת ה-frontend שלך (למשל `http://localhost:8080` בפיתוח, ו-`https://yourdomain.com` בפרודקשן)
- הוסף את אותן כתובות תחת **Redirect URLs**

### ה. צור משתמש Admin
1. הירשם דרך האפליקציה עם המייל שלך
2. ב-SQL Editor הרץ:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
```
3. עדכן ב-`src/lib/auth.ts` את הקבוע `ADMIN_EMAIL` למייל שלך.

### ו. הוסף Secrets ל-Edge Functions
ב-Project Settings → Edge Functions → Secrets, וודא שקיימים:
- `SUPABASE_URL` (אוטומטי)
- `SUPABASE_ANON_KEY` (אוטומטי)
- `SUPABASE_SERVICE_ROLE_KEY` (אוטומטי)
- `RESEND_API_KEY` (אם תפעיל מיילים — אופציונלי)
- `GROW_API_KEY` / `CARDCOM_TERMINAL` (כשתחבר תשלום אמיתי)

### ז. פרוס את ה-Edge Functions
```bash
supabase functions deploy admin-create-resident
supabase functions deploy create-deposit
supabase functions deploy notify-admin
supabase functions deploy payment-webhook --no-verify-jwt
```

---

## 4. משתני סביבה (Frontend)

צור קובץ `.env` בשורש הפרויקט:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_PUBLIC_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

⚠️ **חשוב**: רק keys ציבוריים (anon) — לעולם לא service_role ב-frontend!

---

## 5. הרצה לוקאלית

```bash
# התקנה
npm install
# או: bun install

# הרצה
npm run dev
# פותח ב-http://localhost:8080

# Build לפרודקשן
npm run build

# Preview של ה-build
npm run preview
```

---

## 6. פריסה ל-Vercel

1. דחוף את הקוד ל-GitHub
2. https://vercel.com → Import Project → בחר את הריפו
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build` (ברירת מחדל)
5. **Output Directory**: `dist`
6. **Environment Variables** — הוסף את 3 המשתנים מסעיף 4
7. Deploy

**SPA Routing** — Vercel מטפל בזה אוטומטית עבור Vite, אבל אם יש 404 ב-refresh, צור `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 7. פריסה ל-Netlify

1. דחוף את הקוד ל-GitHub
2. https://app.netlify.com → Add new site → Import from Git
3. **Build command**: `npm run build`
4. **Publish directory**: `dist`
5. **Environment Variables** — הוסף את 3 המשתנים מסעיף 4
6. Deploy

צור `public/_redirects` עבור SPA routing:
```
/*    /index.html   200
```

---

## 8. סקירת טבלאות ו-RLS

כל הטבלאות תחת schema `public`. RLS מופעל בכולן.

| טבלה | תפקיד | RLS עיקרי |
|---|---|---|
| `profiles` | פרופיל משתמש (resident/supplier/admin) | משתמש רואה ועורך רק את עצמו; אדמין רואה הכל |
| `user_roles` | תפקידי משתמש (enum: resident/supplier/admin) | משתמש רואה את שלו; אדמין מנהל הכל. **תמיד נפרד מ-profiles למניעת privilege escalation** |
| `suppliers` | פרטי ספק | ציבורי קורא רק approved+active+!is_deleted; ספק עורך את שלו; אדמין כל יכול |
| `supplier_regions` / `supplier_cities` | אזורי שירות | ציבורי קורא; ספק/אדמין עורך |
| `supplier_gallery` | תמונות גלריה | ציבורי קורא; ספק עורך את שלו |
| `regions` / `cities` | רשימות גיאוגרפיות | ציבורי קורא; אדמין עורך |
| `deals` | הצעות / עסקאות קבוצתיות | ציבורי רואה active; ספק עורך משלו; אדמין הכל |
| `deal_interests` | הרשמות דיירים להצעה (לידים) | משתמש רואה את שלו; ספק רואה לידים על העסקאות שלו; אדמין הכל |
| `deposits` | פיקדונות / תשלומים | משתמש רואה את שלו; אדמין הכל |
| `reviews` | ביקורות על ספקים | קריאה ציבורית; כתיבה רק למי ששילם פיקדון על אותה עסקה |
| `notifications` | התראות למשתמש | משתמש רואה ומסמן את שלו |
| `system_settings` / `admin_settings` | הגדרות מערכת | קריאה למחוברים; כתיבה רק לאדמין |
| `waitlist_leads` | רשימת המתנה ציבורית | INSERT פתוח לכולם; קריאה רק לאדמין |

### Functions קריטיות
- `has_role(user_id, role)` — SECURITY DEFINER, נמנעת רקורסיית RLS
- `handle_new_user()` — trigger על `auth.users` שיוצרת `profiles` + `user_roles` אוטומטית בהרשמה
- `get_deal_interest_count(deal_id)` — סופרת מצטרפים פעילים (לא נמחקו)
- `get_deal_paid_count(deal_id)` — סופרת מי ששילם
- `get_supplier_rating(supplier_id)` — מחשבת ממוצע + מספר ביקורות
- `user_can_review(user_id, deal_id)` — בודקת זכאות לכתיבת ביקורת
- `validate_deal_offer()` — trigger ולידציה על מדרגות מחיר ב-`deals`
- `refresh_supplier_service_areas()` — מעדכנת מערך אזורי שירות לספק

### Soft Delete
כל הטבלאות העיקריות (`suppliers`, `deals`, `deal_interests`, `profiles`, `deposits`, `reviews`, `notifications`) כוללות `is_deleted boolean` ו-`deleted_at timestamptz`. RLS מסנן אוטומטית רשומות מחוקות בקריאות ציבוריות.

---

## 9. Mock Data — מצב נוכחי

הקובץ `src/data/mockData.ts` עדיין מכיל:
- **`categories`** — רשימת קטגוריות סטטית (אדריכל, חשמל וכו') — בשימוש כ-lookup ב-frontend
- **`projects`, `suppliers`, `deals`, `reviews`, `deposits`, `notifications`** — **מערכים ריקים**, לא בשימוש
- **`demoUsers`** — לא בשימוש בפרודקשן

**כל הנתונים האמיתיים נטענים מ-Supabase**. הקטגוריות אפשר להעביר לטבלת `categories` ב-DB אם רוצים ניהול דינמי (ראה משימה עתידית).

---

## 10. מבנה ניתובים עיקרי

| Route | תיאור |
|---|---|
| `/` | Landing |
| `/auth?mode=signup\|signin` | הרשמה/התחברות |
| `/resident` | דשבורד דייר |
| `/resident/categories?stage=N` | קטגוריות לפי שלב בנייה |
| `/resident/categories/:id` | ספקים בקטגוריה |
| `/resident/deals/:id` | פרטי עסקה + הצטרפות |
| `/supplier` | דשבורד ספק |
| `/supplier/offers/new` | יצירת הצעה |
| `/supplier/leads` | לידים |
| `/admin` | דשבורד אדמין (gated) |

---

## 11. Checklist להעברה חלקה

- [ ] יצרת פרויקט Supabase חדש
- [ ] הרצת את כל המיגרציות (22 קבצים)
- [ ] יצרת 3 storage buckets + policies
- [ ] הגדרת Site URL + Redirect URLs ב-Auth
- [ ] עדכנת `ADMIN_EMAIL` ב-`src/lib/auth.ts`
- [ ] יצרת `.env` עם 3 המשתנים
- [ ] הרצת `npm install && npm run dev` — האפליקציה עולה
- [ ] נרשמת ושייכת לעצמך תפקיד admin
- [ ] פרסת Edge Functions
- [ ] פרסת frontend ל-Vercel/Netlify עם env vars

---

## 12. הערות חשובות

- **`src/integrations/supabase/types.ts`** — מתעדכן ע"י Supabase CLI: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
- **`src/integrations/supabase/client.ts`** — הקובץ קורא מ-`import.meta.env`, עובד ככה גם בלי Lovable.
- **אין** תלות ב-Lovable runtime — הפרויקט סטנדרטי לחלוטין.
- אם רוצים להחליף את ה-Edge Functions ל-API חיצוני (Node/Express), הקוד שלהם ב-Deno פשוט להעברה.

בהצלחה! 🚀
