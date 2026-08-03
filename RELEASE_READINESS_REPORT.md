# GroupBuild — Release Readiness Report (TestFlight)

תאריך: 2026-08-03 · אין Archive ואין הגשה אוטומטית ל-App Store.

---

## 1. Residents — GroupBuild

| שדה | ערך |
|---|---|
| Build command | `APP_PROFILE=residents npx tsx scripts/build-app.ts --sync` |
| Web build | `npx vite build --mode residents --outDir dist-residents` |
| Output path | `dist-residents/` → `ios-residents/App/App/public` |
| Bundle size | 4.2MB total · JS 1.99MB (93 chunks) |
| Version | 1.0.0 |
| Build number | 1 |
| Bundle ID | `il.co.groupbuild.residents` |
| App profile | `residents` (VITE_APP_MODE=residents) |
| Team ID | 2N86W3KYFJ |

### PASS / FAIL
| בדיקה | תוצאה | ראיה |
|---|---|---|
| Release build | PASS | vite build exit 0, 19.6s |
| Bundle ID | PASS | `PRODUCT_BUNDLE_IDENTIFIER = il.co.groupbuild.residents` |
| App Name | PASS | `CFBundleDisplayName = GroupBuild` |
| App Icon | PASS | 18 גדלים, כל ה-filenames קיימים, 1024 כלול |
| Splash | PASS | Splash.imageset 3 קבצים 2732×2732, רקע `#F7F5F0` |
| Entitlements | PASS | `aps-environment=development`, associated-domains |
| Associated Domains | PASS | `applinks:groupbuild.co.il` + AASA חי עם `/r/*`,`/share/deal/*` |
| Push capability | PASS (config) | `@capacitor/push-notifications` ב-SPM + aps-environment |
| אין Routes/Chunks של Suppliers | PASS | אין `SupplierDashboard/Offers/Leads/Onboarding/Scan/Analytics`. קיימים רק מסכי ציבור משותפים: `SupplierProfile` (פרופיל ספק ציבורי), `TermsSuppliers` |
| אין Admin בבאנדל | PASS | 0 chunks עם `Admin` |
| אין Secrets בקוד/באנדל | PASS | grep על SERVICE_ROLE/sk_live/sk_test/CARDCOM_/APNS_ → NONE |
| אין Debug Flags | PASS | אין `forceHideBadge`/`__DEV__`/`VITE_DEBUG` |
| Console errors בבילד ייצור | PASS | 0 שגיאות על 8 מסכים (dist-residents preview) |

### חסמים שנותרו — Residents
1. **P0 — Sign in with Apple חסר.** יש רק Google OAuth (`Auth.tsx:228`). Apple Guideline 4.8 מחייב Apple Sign-In כשקיים Social Login. → דחייה כמעט ודאית.
2. **P0 — Cardcom Secrets לא מוגדרים.** קיים רק `CARDCOM_WEBHOOK_SECRET`. חסרים `CARDCOM_TERMINAL_TEST/LIVE`, `CARDCOM_API_NAME_*`, `CARDCOM_API_PASSWORD_*`, `PAYMENT_ENVIRONMENT`. תשלום ייכשל (Fail-Closed) → הצטרפות לעסקה חסומה.
3. **P1 — APNS Bundle ID יחיד.** `send-push` קורא `APNS_BUNDLE_ID` בודד; לא ניתן לשרת שתי אפליקציות במקביל. נדרש פיצול לפי `APNS_RESIDENTS_*` / `APNS_SUPPLIERS_*`.
4. **P1 — `aps-environment=development`.** תקין ל-TestFlight (Xcode ממיר ל-production בייצוא Distribution) — לוודא בעת ה-Archive.
5. **P2 — MARKETING_VERSION בפרויקט = 1.0** בעוד Info.plist = 1.0.0 (ה-plist גובר; ליישר בהזדמנות).

**החלטה: Residents — Not Ready for TestFlight** (חוסמי P0 1+2). לאחר הוספת Apple Sign-In והזנת Cardcom Secrets → Ready.

---

## 2. Suppliers — GroupBuild לעסקים

| שדה | ערך |
|---|---|
| Build command | `APP_PROFILE=suppliers npx tsx scripts/build-app.ts --sync` |
| Web build | `npx vite build --mode suppliers --outDir dist-suppliers` |
| Output path | `dist-suppliers/` → `ios-suppliers/App/App/public` |
| Bundle size | 4.5MB total · JS 2.35MB (92 chunks) |
| Version | 1.0.0 |
| Build number | 1 |
| Bundle ID | `il.co.groupbuild.suppliers` |
| App profile | `suppliers` (VITE_APP_MODE=suppliers) |
| Team ID | 2N86W3KYFJ |

### PASS / FAIL
| בדיקה | תוצאה | ראיה |
|---|---|---|
| Release build | PASS | vite build exit 0, 19.8s |
| Bundle ID | PASS | `PRODUCT_BUNDLE_IDENTIFIER = il.co.groupbuild.suppliers` |
| App Name | PASS | `CFBundleDisplayName = GroupBuild לעסקים` |
| App Icon | PASS | 18 גדלים, אין קבצים חסרים |
| Splash | PASS | Splash.imageset 2732×2732, רקע `#0E6B5A` |
| Entitlements | PASS | aps-environment + associated-domains |
| Associated Domains | PASS | AASA עם `/b/*` ל-`2N86W3KYFJ.il.co.groupbuild.suppliers` |
| Push capability | PASS (config) | Push plugin ב-SPM |
| אין Routes/Chunks של Residents | PASS (חלקי) | אין `ResidentDashboard/MyVouchers/MyDeposits/BudgetPlanner/ProjectManagement`. קיימים מסכי ציבור משותפים: `CategoriesList`, `DealDetail`, `DealsList`, `SharedDeal` — אלה `publicRoutes` בכל בילד (עמודי שיתוף/דפדוף ציבוריים), לא מסכי דייר מחוברים |
| אין Admin בבאנדל | PASS | 0 chunks עם `Admin` |
| אין Secrets | PASS | grep → NONE |
| אין Debug Flags | PASS | NONE |
| Console errors בבילד ייצור | PASS | 0 שגיאות על 8 מסכים |

### חסמים שנותרו — Suppliers
1. **P0 — Sign in with Apple חסר** (אותו קוד Auth משותף).
2. **P0 — סורק ברקוד לא מחובר נייטיב.** `@capacitor-mlkit/barcode-scanning` מותקן ב-npm אך **לא מופיע** ב-`ios-suppliers/App/CapApp-SPM/Package.swift`. `SupplierScan` ייכשל במכשיר. תיקון: להריץ `npx cap sync ios` על ה-Mac (מייצר מחדש את Package.swift) ולוודא שהחבילה נוספה, ולהוסיף `NSCameraUsageDescription` (כבר קיים).
3. **P1 — APNS Bundle ID יחיד** (כנ"ל).
4. **P2 — MARKETING_VERSION 1.0 מול 1.0.0.**

**החלטה: Suppliers — Not Ready for TestFlight** (חוסמי P0 1+2).

---

## 3. Runbook ל-Mac

```bash
# 0. תלויות (פעם אחת)
xcode-select --install
sudo gem install cocoapods   # לא חובה ב-SPM, אך שימושי

# 1. Git Pull
cd ~/projects/groupbuild
git pull origin main
npm install            # או: bun install
```

### Residents
```bash
# 2. Build + Sync (מנקה dist ישן, בונה, מסנכרן ל-ios-residents, מייצר אייקונים/splash/plist)
APP_PROFILE=residents npx tsx scripts/build-app.ts --sync

# 3. פתיחת הפרויקט הנכון ב-Xcode
open ios-residents/App/App.xcodeproj
```
ב-Xcode:
1. Target **App** → **Signing & Capabilities**.
2. Team: **2N86W3KYFJ**. Automatically manage signing = ON.
3. Bundle Identifier: `il.co.groupbuild.residents`.
4. Capabilities קיימות: **Push Notifications**, **Associated Domains** (`applinks:groupbuild.co.il`). אם חסרות — `+ Capability` והוסף.
5. General → Version `1.0.0`, Build `1`.
6. סרגל עליון: Scheme **App**, Destination **Any iOS Device (arm64)**.
7. **Product → Archive**.
8. Organizer → **Distribute App → App Store Connect → Upload** → Automatically manage signing → Upload.
9. App Store Connect → TestFlight → להמתין לעיבוד → Internal Testing.

### Suppliers
```bash
APP_PROFILE=suppliers npx tsx scripts/build-app.ts --sync
open ios-suppliers/App/App.xcodeproj
```
אותם שלבים, עם:
- Bundle Identifier: `il.co.groupbuild.suppliers`
- Display Name: `GroupBuild לעסקים`
- לוודא שהחבילה `CapacitorMLKitBarcodeScanning` הופיעה ב-Package Dependencies אחרי ה-sync.

> חשוב: אל תריץ `npx cap sync` בלי `APP_PROFILE` — זה עלול לכתוב על התיקייה הלא-נכונה.

---

## 4. Checklist בדיקות על iPhone אמיתי

### Residents
- [ ] התקנה מ-TestFlight ופתיחה ראשונה (Splash תקין, ללא הבזק שחור)
- [ ] הרשמה עם אימייל + אימות
- [ ] התחברות חוזרת
- [ ] Google Login
- [ ] Apple Login *(חסום עד למימוש)*
- [ ] Guest Mode — דפדוף ללא התחברות + Signup Prompt
- [ ] חיפוש (Overlay, מקלדת עם enterKeyHint=search)
- [ ] Deep Link: `https://groupbuild.co.il/r/deals/<id>` מ-Notes/WhatsApp → נפתח באפליקציה
- [ ] Deep Link: `https://groupbuild.co.il/share/deal/<id>`
- [ ] Push: אישור הרשאה → קבלת התראה → פתיחה למסך הנכון
- [ ] הצטרפות לעסקה (חישוב דמי השתתפות מוצג, Fail-Closed אם אין תעריף)
- [ ] Cardcom Test Payment (PAYMENT_ENVIRONMENT=test)
- [ ] PaymentSuccess — אימות Realtime/Polling, אין תקיעה
- [ ] Back navigation מכל מסך עמוק (useSmartBack, אין מלכודת deep-link)
- [ ] Safe Area: Dynamic Island, Home Indicator, סיבוב מסך
- [ ] מחיקת חשבון → יציאה מלאה + חסימת התחברות

### Suppliers
- [ ] התקנה מ-TestFlight
- [ ] הרשמה והתחברות (Supplier role בלבד)
- [ ] Google Login / Apple Login *(חסום)*
- [ ] Onboarding מלא כולל שמירת Draft ביציאה וחזרה
- [ ] עריכת פרופיל (תמונות, קטגוריות דרך CategoryMultiPicker, אזורי שירות)
- [ ] יצירת הצעה (CategorySinglePicker, מחירים inputMode=decimal)
- [ ] עריכת הצעה קיימת — אין איבוד מחירים
- [ ] סריקת שובר (מצלמה) *(חסום עד sync של ה-plugin)*
- [ ] Deep Link: `https://groupbuild.co.il/b/offers/<id>`
- [ ] Push
- [ ] Back navigation
- [ ] Safe Area
- [ ] מחיקת חשבון

---

## 5. החלטה סופית

- **Residents: Not Ready for TestFlight** — נדרש: Apple Sign-In + Cardcom Secrets.
- **Suppliers: Not Ready for TestFlight** — נדרש: Apple Sign-In + חיבור נייטיב של סורק הברקוד.

התשתית (Bundle ID, שמות, אייקונים, Splash, Entitlements, Associated Domains, Push config, הפרדת באנדלים, היעדר Admin/Secrets/Debug, אפס console errors) — **PASS מלא בשתי האפליקציות**.
אין להכריז Ready for App Store לפני בדיקה אמיתית על iPhone דרך TestFlight.
