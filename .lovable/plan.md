## מטרה
להעביר את הפיקדון מהיות מוצר של GroupBuild להיות עסקה ישירה דייר↔ספק. GroupBuild רק רושמת מטא-דאטה (סכום, סטטוס, קישור, חותמת זמן, אישור ספק).

## שינויי DB (migration)

**טבלת `deals` — שדות חדשים ברמת ההצעה:**
- `supplier_payment_link TEXT` — קישור התשלום של הספק (PayBox / Bit / Tranzila וכו')
- `supplier_payment_instructions TEXT` — הוראות חופשיות (אופציונלי, "ניתן גם להעביר ב-Bit ל-050…")

**טבלת `deal_interests` — שדות חדשים למעקב פיקדון ישיר:**
- `direct_deposit_status TEXT` — `not_required` | `awaiting_payment` | `marked_paid_by_resident` | `confirmed_by_supplier` | `disputed`
- `direct_deposit_amount NUMERIC`
- `resident_marked_paid_at TIMESTAMPTZ`
- `supplier_confirmed_at TIMESTAMPTZ`
- `supplier_confirmed_by UUID`

**טבלת `suppliers` — הרחבת מודל המוניטיזציה:**
- `lead_fee NUMERIC DEFAULT 0` — עמלה לליד
- `success_fee NUMERIC DEFAULT 0` — עמלת הצלחה (סכום קבוע או %)
- `success_fee_type TEXT DEFAULT 'percent'` — `percent` | `fixed`
- (`monthly_subscription` ו-`commission_percent` כבר קיימים)

**RPC חדשות:**
- `resident_mark_deposit_paid(_interest_id uuid)` — דייר מסמן ששילם
- `supplier_confirm_deposit(_interest_id uuid)` — ספק מאשר קבלה; מעדכן `deal_interests.status='paid'`, `deposit_status='paid'`, ויוצר רשומה ב-`deposits` עם `payment_provider='direct_to_supplier'` ו-`status='paid'` כדי שכל הלוגיקה הקיימת (vouchers, סגירה אוטומטית, ספירת משתתפים) תמשיך לעבוד.
- `supplier_dispute_deposit(_interest_id uuid, _reason text)`

## שינויי קוד

**עורך הצעה של ספק (`SupplierOfferMarketingEdit` / `OfferEditor`):**
- שדה "קישור תשלום ישיר" + "הוראות תשלום" + שדה "סכום פיקדון" (קיים, נשאר על הספק).

**מסך פרטי הצעה לדייר (`DealDetail`):**
- כפתור "אני מצטרף" פותח sheet עם:
  - הסכום המדויק
  - כפתור גדול "מעבר לתשלום אצל הספק" → פותח `supplier_payment_link` ב-tab חדש
  - אחרי חזרה: כפתור "סימנתי ששילמתי" → קורא `resident_mark_deposit_paid`
  - באנר ברור: *"הפיקדון משולם ישירות לספק כהוכחת רצינות. GroupBuild אינה גובה או מחזיקה את כספי הפיקדון."*

**מסך הלידים של הספק (`SupplierLeads`):**
- לכל ליד עם `direct_deposit_status='marked_paid_by_resident'`: כפתורים "אשר קבלת פיקדון" / "לא התקבל".
- אישור הספק = "האוטומציה" שהמשתמש ביקש: ברגע שהספק רואה את הכסף ומאשר, המערכת מעדכנת הכל אוטומטית (vouchers נוצרים, ההצעה נסגרת אם הגיעה ליעד).

**מסך אדמין ספק (חדש או הרחבה של `AdminSupplierTrust`):**
- שדות עריכה: `monthly_subscription`, `lead_fee`, `success_fee` + `success_fee_type`, `commission_percent`. נשמר רק ע"י אדמין בעת אישור הספק או עדכון ידני.

**ניטרול הזרם הישן (לא מחיקה — דגל):**
- `create-deposit` edge function לא נמחקת אבל מסך תשלום קיים לא ייפתח כברירת מחדל מהזרם החדש. נשאיר כפתור fallback רק לאדמין במקרה הצורך.

## טקסט UI (נדרש מהמשתמש)
ה-disclaimer יוצג ב-3 מקומות: sheet הצטרפות, עמוד פרטי הצעה (מתחת לסכום), ומסך "ההצעות שלי".

## מה לא נכלל
- אוטומציית verification אמיתית של תשלום (דורש webhook מספק התשלום הפרטי של כל ספק) — האישור הוא של הספק עצמו, וזה משמש כ"אישור אוטומטי" לכל מערכת ההטבות שלנו.
- מחיקת `create-deposit` ו-Cardcom flow — נשארים בקוד כ-legacy.

מאשר? אתחיל ב-migration ואז קוד.
