# ניהול Demand / Group Buy באדמין — Pipeline מלא

מטרה: כל ביקוש שנוצר במערכת ניתן לניהול מלא, לא רק CRUD אלא Workflow: בקשה → בדיקה → קבוצה → הזמנת ספקים → פרסום הצעה → סגירה.

## שלב 1 — הרחבת מודל הנתונים (Migration)

הרחבת `demand_requests`:
- `project_type` (text): private_home / renovation / house_committee / building / neighborhood
- `admin_notes` (text)
- `admin_status` (text): new / in_review / group_forming / suppliers_invited / offer_published / closed / rejected — עמודה חדשה נפרדת מ-`status` הקיים
- `deal_id` (uuid, FK ל-deals) — הצעה שנוצרה מהביקוש
- `participants_count` (int, default 1)
- `closed_at` (timestamptz)
- `first_reviewed_at` (timestamptz) — לחישוב זמן טיפול ממוצע

טבלה חדשה `demand_activity_log`:
- id, demand_id, actor_id, action (text), payload (jsonb), created_at
- RLS: אדמינים בלבד רואים; רשומות נוצרות דרך trigger/RPC

טבלה חדשה `demand_participants` (חברי הקבוצה):
- id, demand_id, user_id, full_name, phone, joined_at
- RLS: יוצר הביקוש והאדמין רואים

טבלה חדשה `demand_messages` (הודעות למשתתפים):
- id, demand_id, admin_id, subject, body, sent_at, recipients_count

RPCs חדשות:
- `admin_change_demand_status(_demand_id, _new_status, _note)` — משנה סטטוס + כותב ל-activity log + notify creator
- `admin_convert_demand_to_deal(_demand_id, _deal_payload jsonb)` — יוצר Deal, מקשר, מעדכן סטטוס
- `admin_invite_suppliers_to_demand(_demand_id, _supplier_ids uuid[])` — INSERT ל-demand_invitations + notify
- `admin_message_demand_participants(_demand_id, _subject, _body)` — notify_user לכל חבר קבוצה + יוצר
- `admin_close_demand(_demand_id, _reason)`

## שלב 2 — מסך רשימה `/admin/demand`

- כרטיסים קומפקטיים בגריד (בעקבות דפוס הספקים)
- שדות מוצגים: סטטוס (chip צבוע), קטגוריה, project_type, אזור/עיר, participants_count, created_at, badge "יש הצעה" אם `deal_id` קיים
- פילטרים: סטטוס, קטגוריה, project_type, אזור, "יש הצעה"/"אין הצעה"
- חיפוש טקסט חופשי בתיאור
- לחיצה → `/admin/demand/:id`

## שלב 3 — מסך פרטים `/admin/demand/:id`

Layout: header עם pipeline stepper אופקי (7 שלבים) המראה איפה עומדים.

Sections (collapsible):
1. **פרטי הבקשה** — כל השדות + עריכת admin_notes
2. **יוצר הבקשה** — שם, טלפון, אימייל, פרויקט
3. **חברי הקבוצה** — טבלה מ-demand_participants + כפתור "הוסף חבר"
4. **מסמכים ותמונות** — משתמש ב-documents הקיים עם related_type='demand'
5. **הזמנות לספקים** — טבלה מ-demand_invitations: ספק, סטטוס, תאריך זימון, תאריך תגובה, האם הגיש הצעה
6. **הצעות ספקים** — deals עם reference לביקוש (דרך deal_id שיצרנו)
7. **לוג פעילות** — demand_activity_log
8. **הודעות שנשלחו** — demand_messages

Action bar (sticky):
- שינוי סטטוס (Select + Save)
- שיוך לפרויקט קיים (Combobox של projects) / יצירת פרויקט חדש (dialog)
- **יצירת הצעה מהביקוש** — dialog עם prefill (category, region, description, target_qty→target_participants) → קריאה ל-`admin_convert_demand_to_deal` → ניווט ל-OfferEditor של ה-Deal החדש
- **הזמנת ספקים** — dialog: מסנן ספקים לפי הקטגוריה+אזור של הביקוש, multi-select, שולח
- **שליחת הודעה למשתתפים** — dialog עם subject+body
- **סגירת הביקוש** — עם סיבה

## שלב 4 — Dashboard KPIs

הוספה ל-`AdminDashboard.tsx` בכרטיס "ביקושים":
- ביקושים חדשים (admin_status='new')
- ביקושים פתוחים (לא closed/rejected)
- ביקושים שהפכו להצעות (deal_id IS NOT NULL)
- אחוז המרה = הפכו/סה"כ
- זמן טיפול ממוצע = AVG(first_reviewed_at - created_at) לביקושים שנבדקו

RPC יחיד: `get_admin_demand_kpis()` שמחזיר את הכל.

## שלב 5 — Routing & Nav

- `src/App.tsx`: הוספת routes `/admin/demand`, `/admin/demand/:id`
- `AdminLayout` / sidebar: הוספת פריט "ביקושים" עם badge של new count

## פרטים טכניים

- קבצים חדשים:
  - `supabase/migrations/<ts>_admin_demand_workflow.sql`
  - `src/pages/admin/AdminDemandList.tsx`
  - `src/pages/admin/AdminDemandDetail.tsx`
  - `src/components/admin/DemandPipelineStepper.tsx`
  - `src/components/admin/InviteSuppliersDialog.tsx`
  - `src/components/admin/ConvertDemandToDealDialog.tsx`
  - `src/components/admin/DemandMessageDialog.tsx`
- קבצים לעריכה: `src/App.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/components/admin/AdminSidebar.tsx` (אם קיים)
- כל ה-RPCs SECURITY DEFINER + בדיקת `has_role(auth.uid(),'admin')`
- כל ה-activity log נכתב אוטומטית מתוך ה-RPCs (אין כתיבה מהלקוח)
- GRANTs מלאים על כל טבלה חדשה

## סדר ביצוע

1. Migration (מבקש אישור מהמשתמש)
2. אחרי שהמיגרציה עוברת ו-types מתעדכנים — כותב את כל קבצי ה-UI במקביל
3. QA ידני אתה מבצע לפי הסדר: יצירת ביקוש → רשימה → פתיחת פרטים → זימון ספקים → יצירת הצעה
