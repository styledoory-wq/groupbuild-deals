## שדרוג GroupBuild — מנגנון זכאות, שוברים דיגיטליים ומימוש ספקים

מערכת ה-MVP תתווסף על הקוד הקיים מבלי לשבור תהליכים. כל המורכבות (אבטחה, audit, rotation של QR) מוסתרת — לדייר ולספק נשארת חוויה של 2-3 קליקים.

---

### 1. שינויי DB (migration אחת)

**הרחבת `deals`:**
- `target_participants` (int), `join_deadline` (timestamptz), `redemption_deadline` (timestamptz)
- `service_areas` (text[]), `appointment_required` (bool), `offer_terms` (text)
- `max_redemptions` (int), `restrictions` (text)
- `auto_closed_at` (timestamptz) — מתי נסגרה אוטומטית
- `supplier_commitment_accepted` (bool) — checkbox בעת יצירת הצעה

**טבלה חדשה `vouchers` (שוברי זכאות):**
- `id`, `code` (גיבוי קצר ייחודי), `deal_id`, `user_id`, `supplier_id`
- `status` (`eligible` | `appointment` | `measured` | `ordered` | `installed` | `completed` | `redeemed` | `expired`)
- `issued_at`, `expires_at`, `redeemed_at`, `redeemed_by_supplier_id`
- `reference_number` (אסמכתא ייחודית מוצגת לדייר)
- `rotation_secret` (משמש לחתימת QR דינמי)

**טבלה חדשה `voucher_audit_log`:**
- `voucher_id`, `actor_id`, `action` (`issued`/`scanned`/`redeemed`/`duplicate_attempt`/`failed`/`status_changed`/`admin_override`)
- `ip`, `user_agent`, `metadata jsonb`, `created_at`

**טבלה חדשה `complaints`:**
- `user_id`, `deal_id`, `supplier_id`, `issue_type`, `description`, `attachments jsonb`, `status`, `created_at`

**הרחבת `suppliers`:**
- `trust_score` (numeric), `verified_supplier` (bool), `complaints_count` (int), `successful_redemptions` (int)
- (`rating` כבר קיים דרך reviews; `redemption_rate` יחושב view)

**פונקציות / triggers:**
- `trg_auto_close_deal` — כשמספר ה-`paid` ב-`deposits` ≥ `target_participants` → סטטוס=`closed`, יצירת voucher לכל משתתף, `auto_closed_at=now()`.
- `redeem_voucher(_code, _qr_token)` — security definer: אימות חתימת QR, חסימת duplicate, עדכון `redeemed_*`, audit log, עדכון מונה ספק.
- `lock_closed_deal_fields` — מונע שינוי מחיר/תנאים אחרי `auto_closed_at` אלא ל-admin.

**RLS:**
- דייר רואה רק שוברים שלו; ספק רואה רק שוברים של ההצעות שלו; admin רואה הכול.
- audit log — insert חופשי מ-definer functions, select admin בלבד.

---

### 2. Edge Functions

- **`voucher-qr-token`** — מחזיר JWT קצר מועד (60s) עם `voucher_id` חתום ב-`rotation_secret`. נקרא כל 45s מהלקוח.
- **`voucher-redeem`** — מקבל token+supplier auth, מאמת, קורא ל-`redeem_voucher`, מחזיר תוצאה.
- **`voucher-status-update`** — לעדכון סטטוסים על ידי הספק (נקבעה פגישה / הותקן וכו').

---

### 3. שינויים בקוד / מסכים חדשים

**דייר:**
- מסך חדש `/resident/my-vouchers` ("ההטבה שלי"): כרטיס שובר עם QR מתחדש, קוד גיבוי, אסמכתא, סטטוס, תוקף.
- ב-`DealsList` ובכרטיסים: chip "X מ-Y הצטרפו · נשאר N", "K שכנים בבניין כבר מימשו".
- ב-`MyOffers`: ברגע שעסקה נסגרת → CTA "צפה בשובר".
- כפתור "דווח על בעיה" בעמוד עסקה / שובר.

**ספק (תוספות לאזור הקיים, לא דשבורד חדש):**
- `/supplier/scan` — מסך סריקה: מצלמה (QR) + שדה קוד ידני → מסך ירוק "הדייר זכאי" → "אשר מימוש".
- `/supplier/redemptions` — טבלת לקוחות זכאים: דייר, פרויקט, הצעה, מחיר, סטטוס (Select inline לעדכון), חיפוש/סינון.
- בכרטיס הצעה: מונים — זכאים, מימשו, % מימוש, פוטנציאל הכנסה.
- ב-`OfferEditor`: שדות חדשים (יעד משתתפים, deadlines, תקנון), checkbox התחייבות חובה.

**Admin:**
- הרחבת `AdminDeals`: עמודות זכאים/מומשו/תלונות/אחוז מימוש.
- מסך חדש `/admin/complaints`.
- בכרטיס ספק: כפתורי השעיה/חסימה/אימות + צפיית Audit Log.
- Override ידני לשובר (פתיחה מחדש / שינוי תוקף) עם רישום ב-audit.

---

### 4. אבטחה ו-UX (מאחורי הקלעים)

- QR מתחדש כל 45-60s דרך React Query polling, חתימה HMAC עם `rotation_secret` (לא חשוף לקליינט).
- ניסיון מימוש כפול → audit + תגובה "השובר כבר מומש" + notify_admins.
- חסימת עריכת עסקה סגורה ברמת trigger.
- כל הטפסים נקיים: שובר = QR גדול + 3 שדות. סריקה לספק = מסך אחד.

---

### Technical details

קבצים חדשים: `src/pages/resident/MyVouchers.tsx`, `VoucherCard.tsx`, `src/pages/supplier/SupplierScan.tsx`, `SupplierRedemptions.tsx`, `src/pages/admin/AdminComplaints.tsx`, `src/components/complaints/ReportIssueDialog.tsx`, `supabase/functions/voucher-qr-token/index.ts`, `voucher-redeem/index.ts`, `voucher-status-update/index.ts`. שינויים ב-`App.tsx` (routes), `BottomNav.tsx` (טאב "ההטבה שלי" לדייר, "סריקה" לספק), `OfferEditor.tsx`, `DealDetail.tsx`, `MyOffers.tsx`, `AdminDeals.tsx`.

ספריות: `html5-qrcode` לסריקה, `qrcode.react` לתצוגה.

---

### היקף MVP — מה דוחים לשלב ב'

- חישוב trust_score אוטומטי (נשאיר עדכון ידני של admin בינתיים).
- התראות SMS למימוש (יישאר רק push/email דרך מנגנון notifications הקיים).
- ניתוח device fingerprint עמוק (נשמור IP+UA בלבד).

---

האם לאשר את התוכנית ולהתחיל ביישום? אם תרצה — אפשר לחלק לשלבים (קודם DB+שובר, אחר כך מסכי ספק, אחר כך admin/תלונות).
