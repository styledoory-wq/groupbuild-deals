# שלב 2 — ארכיטקטורת Profiles Registry מלאה

## עיקרון מרכזי
**רישום פרופילים אחד** (`app-profiles.config.ts`) הוא מקור האמת. ממנו נגזרים אוטומטית: capacitor config, env, scripts, iOS folder, icons, splash, deep links, push credentials, Firebase, privacy manifest, App Store metadata, feature flags. **הוספת אפליקציה חדשה = הוספת רשומה אחת. אפס שינוי בקוד עסקי.** תיקיית `ios/` הקיימת לא נגעת.

---

## 1. סכימת Profile — כל הממדים הניתנים להתאמה

`app-profiles.config.ts` בשורש:
```ts
export type AppProfile = {
  // Identity
  id: string;                    // "residents" | "suppliers" | "committee" | ...
  appMode: string;               // VITE_APP_MODE (מסנן routes)
  appId: string;                 // Bundle ID (iOS + Android)
  appName: string;               // CFBundleDisplayName / Android app_name
  shortName?: string;            // תצוגה מקוצרת (Home Screen)
  version?: string;              // ברירת מחדל מ־package.json

  // Visual assets (paths only — קבצים נטענים מאוחר)
  resourcesDir: string;          // "resources/residents"
  iconPath: string;              // `${resourcesDir}/icon.png` (1024x1024)
  splashPath: string;            // `${resourcesDir}/splash.png` (2732x2732)
  splashBackgroundColor: string; // "#F7F5F0"
  themeColor: string;            // status bar / theme

  // Build outputs
  webDir: string;                // "dist-residents"
  iosDir: string;                // "ios-residents"
  androidDir: string;            // "android-residents"

  // Deep links
  scheme?: string;               // "groupbuild-residents"
  universalLinks: {
    host: string;                // "groupbuild.co.il"
    paths: string[];             // ["/r/*"]
  };

  // Push notifications
  push: {
    variant: string;             // "residents" — מפתח למיפוי credentials
    apnsSecretPrefix: string;    // "APNS_RESIDENTS" → APNS_RESIDENTS_KEY/KEY_ID/TEAM_ID
    fcmConfigPath?: string;      // `${resourcesDir}/google-services.json`
  };

  // Apple config
  apple: {
    teamId?: string;             // "ABCD123456" (אופציונלי, מ־secret)
    entitlementsPath: string;    // `${iosDir}/App/App/App.entitlements`
    provisioningProfileName?: string;
  };

  // Privacy manifest
  privacyManifest: {
    collectedDataTypes: string[];  // NSPrivacyCollectedDataType keys
    accessedAPITypes: Array<{ type: string; reasons: string[] }>;
    trackingEnabled: boolean;
  };

  // App Store metadata (נטען לפי CI ל־App Store Connect)
  storeMetadata: {
    primaryCategory: string;     // "BUSINESS" | "LIFESTYLE"
    secondaryCategory?: string;
    keywords: string[];          // עד 100 תווים סה"כ
    supportUrl: string;
    marketingUrl?: string;
    privacyPolicyUrl: string;
    description: {               // רב־לשוני
      he: string;
      en?: string;
    };
    promotionalText?: { he: string; en?: string };
    ageRating?: string;          // "4+"
  };

  // Feature flags — כיבוי/הפעלה של פיצ'רים לכל אפליקציה
  features: {
    residentDeals?: boolean;
    supplierScan?: boolean;
    budgetPlanner?: boolean;
    committeeQuotes?: boolean;
    voucherRedemption?: boolean;
    payments?: boolean;
    ai?: boolean;
    // ...הרחבה עתידית
  };
};

export const APP_PROFILES: AppProfile[] = [
  {
    id: "residents",
    appMode: "residents",
    appId: "il.co.groupbuild.residents",
    appName: "GroupBuild",
    shortName: "GroupBuild",
    resourcesDir: "resources/residents",
    iconPath: "resources/residents/icon.png",
    splashPath: "resources/residents/splash.png",
    splashBackgroundColor: "#F7F5F0",
    themeColor: "#F8F6F1",
    webDir: "dist-residents",
    iosDir: "ios-residents",
    androidDir: "android-residents",
    scheme: "groupbuild-residents",
    universalLinks: { host: "groupbuild.co.il", paths: ["/r/*", "/share/deal/*"] },
    push: {
      variant: "residents",
      apnsSecretPrefix: "APNS_RESIDENTS",
      fcmConfigPath: "resources/residents/google-services.json",
    },
    apple: { entitlementsPath: "ios-residents/App/App/App.entitlements" },
    privacyManifest: {
      collectedDataTypes: ["Email","PhoneNumber","Name","PreciseLocation","PhotosorVideos"],
      accessedAPITypes: [
        { type: "UserDefaults", reasons: ["CA92.1"] },
        { type: "FileTimestamp", reasons: ["C617.1"] },
      ],
      trackingEnabled: false,
    },
    storeMetadata: {
      primaryCategory: "LIFESTYLE",
      keywords: ["שיפוץ","דירה","קבוצת רכישה","דיירים","בית"],
      supportUrl: "https://groupbuild.co.il/support",
      privacyPolicyUrl: "https://groupbuild.co.il/privacy",
      description: { he: "GroupBuild — רכישה קבוצתית לדיירים ומשפצים." },
      ageRating: "4+",
    },
    features: {
      residentDeals: true, budgetPlanner: true, voucherRedemption: true,
      supplierScan: false, committeeQuotes: false, payments: true, ai: true,
    },
  },
  {
    id: "suppliers",
    appMode: "suppliers",
    appId: "il.co.groupbuild.suppliers",
    appName: "GroupBuild לעסקים",
    shortName: "GB Business",
    resourcesDir: "resources/suppliers",
    iconPath: "resources/suppliers/icon.png",
    splashPath: "resources/suppliers/splash.png",
    splashBackgroundColor: "#0E6B5A",
    themeColor: "#0E6B5A",
    webDir: "dist-suppliers",
    iosDir: "ios-suppliers",
    androidDir: "android-suppliers",
    scheme: "groupbuild-suppliers",
    universalLinks: { host: "groupbuild.co.il", paths: ["/b/*"] },
    push: {
      variant: "suppliers",
      apnsSecretPrefix: "APNS_SUPPLIERS",
      fcmConfigPath: "resources/suppliers/google-services.json",
    },
    apple: { entitlementsPath: "ios-suppliers/App/App/App.entitlements" },
    privacyManifest: {
      collectedDataTypes: ["Email","PhoneNumber","Name","PhotosorVideos"],
      accessedAPITypes: [
        { type: "UserDefaults", reasons: ["CA92.1"] },
        { type: "FileTimestamp", reasons: ["C617.1"] },
      ],
      trackingEnabled: false,
    },
    storeMetadata: {
      primaryCategory: "BUSINESS",
      keywords: ["ספקים","קבלנים","לידים","הצעות","עסקים"],
      supportUrl: "https://groupbuild.co.il/support",
      privacyPolicyUrl: "https://groupbuild.co.il/privacy",
      description: { he: "GroupBuild לעסקים — ניהול לידים והצעות לספקים וקבלנים." },
      ageRating: "4+",
    },
    features: {
      supplierScan: true, ai: true, payments: true,
      residentDeals: false, budgetPlanner: false,
      voucherRedemption: false, committeeQuotes: false,
    },
  },
  // עתיד: committee, contractor — רק להוסיף רשומה, אין שינוי קוד
];
```

---

## 2. Generators — קוד שיוצר את כל השאר

תיקיית `scripts/`:

| Script | תפקיד |
|---|---|
| `build-app.ts` | build+sync+open לפי `APP_PROFILE` |
| `generate-capacitor-config.ts` | ייצוא config מתאים בזמן ריצה |
| `generate-aasa.ts` | יוצר `public/.well-known/apple-app-site-association` מכל הפרופילים |
| `generate-privacy-manifest.ts` | יוצר `PrivacyInfo.xcprivacy` לכל `iosDir` |
| `generate-info-plist-overrides.ts` | מזרים `CFBundleDisplayName`, `CFBundleURLTypes`, entitlements |
| `sync-assets.ts` | מעתיק `icon.png`+`splash.png` ל־`Assets.xcassets` של הפרופיל בלבד |
| `sync-firebase.ts` | מעתיק `google-services.json` ל־`androidDir` של הפרופיל בלבד |
| `generate-store-metadata.ts` | מפיק מבנה fastlane `metadata/<lang>/` לכל פרופיל |
| `generate-env.ts` | יוצר `.env.<id>` עם `VITE_APP_MODE`+`VITE_APP_PROFILE_ID` |

הפרופיל **לעולם לא נוגע** בתיקיות של פרופיל אחר — כל sync פועל רק על `iosDir`/`androidDir`/`webDir` של הפרופיל הפעיל.

---

## 3. Capacitor config דינמי

`capacitor.config.ts` בשורש, קורא מהרישום:
```ts
const id = process.env.APP_PROFILE ?? "residents";
const p = APP_PROFILES.find(x => x.id === id)!;
export default {
  appId: p.appId,
  appName: p.appName,
  webDir: p.webDir,
  ios: { path: p.iosDir, scheme: p.appName },
  android: { path: p.androidDir },
  plugins: {
    SplashScreen: { backgroundColor: p.splashBackgroundColor, ... },
    PushNotifications: { presentationOptions: ["badge","sound","alert"] },
  },
};
```

**התיקייה `ios/` הקיימת** מטופלת דרך `capacitor.config.dev.ts` נפרד להוט־רילוד ב־Lovable — לא נגעים בה.

---

## 4. Feature Flags בקוד — hook יחיד

`src/config/features.ts`:
```ts
import { APP_PROFILES } from "../../app-profiles.config";
const id = import.meta.env.VITE_APP_PROFILE_ID ?? "web";
const profile = APP_PROFILES.find(p => p.id === id);
export const FEATURES = profile?.features ?? {}; // web = הכל דלוק
export const isFeatureEnabled = (k: string) => FEATURES[k] !== false;
```
שימוש בקוד קיים ללא שינוי לוגיקה:
```tsx
{isFeatureEnabled("budgetPlanner") && <BudgetPlannerLink />}
```
בשלב 2 **לא נוסיף בדיקות פיצ'ר לעמודים קיימים** — רק תשתית. הוספת feature flag לעמוד = שינוי נקודתי בהמשך.

---

## 5. Push credentials — Supabase secrets לפי variant

Edge function `send-push` קיימת. תעודכן לקבל `app_variant` מ־`push_tokens` ולבחור credentials:
```
APNS_<VARIANT>_KEY, APNS_<VARIANT>_KEY_ID, APNS_<VARIANT>_TEAM_ID
FCM_<VARIANT>_SERVICE_ACCOUNT_JSON
```
Migration עתידית (לא בשלב זה): הוספת עמודה `app_variant` ל־`device_tokens`.

---

## 6. Scripts ב־package.json

```json
"app:build":  "tsx scripts/build-app.ts",
"app:sync":   "APP_PROFILE=$APP_PROFILE tsx scripts/build-app.ts --sync",
"app:open":   "tsx scripts/build-app.ts --open",
"app:add-ios":"tsx scripts/build-app.ts --add-ios",
"app:add-android":"tsx scripts/build-app.ts --add-android",
"app:aasa":   "tsx scripts/generate-aasa.ts",
"app:store-metadata":"tsx scripts/generate-store-metadata.ts"
```
שימוש:
```bash
APP_PROFILE=residents npm run app:sync
APP_PROFILE=suppliers npm run app:sync
```

---

## 7. CI/CD (GitHub Actions) — matrix מהרישום

```yaml
strategy:
  matrix:
    profile: ${{ fromJson(needs.list-profiles.outputs.ids) }}
steps:
  - run: APP_PROFILE=${{ matrix.profile }} npm run app:sync
  - run: APP_PROFILE=${{ matrix.profile }} npm run app:store-metadata
  - uses: apple-actions/upload-testflight-build@v1
    with:
      app-path: ios-${{ matrix.profile }}/App/build/App.ipa
      api-key-id: ${{ secrets[format('ASC_KEY_ID_{0}', matrix.profile)] }}
      api-private-key: ${{ secrets[format('ASC_PKEY_{0}', matrix.profile)] }}
```
`list-profiles` job קורא את `APP_PROFILES` ומחזיר את ה־ids → matrix דינמי. **הוספת פרופיל ב־registry = מופיע ב־CI אוטומטית.**

---

## 8. הרחבה עתידית — 3 צעדים בלבד

1. הוספת רשומה ל־`APP_PROFILES` עם כל השדות.
2. הנחת icon+splash תחת `resources/<id>/`.
3. הרצה: `APP_PROFILE=<id> npm run app:add-ios` (חד־פעמית, מקומית).

**אין נגיעה בקוד עסקי, אין נגיעה ב־Supabase, אין נגיעה ב־builds אחרים.**

---

## 9. מבנה קבצים סופי

```text
app-profiles.config.ts           ← מקור אמת יחיד
capacitor.config.ts              ← דינמי
capacitor.config.dev.ts          ← Lovable hot-reload בלבד
src/config/
  appMode.ts                     ← קיים
  features.ts                    ← NEW
scripts/
  build-app.ts
  generate-capacitor-config.ts
  generate-aasa.ts
  generate-privacy-manifest.ts
  generate-info-plist-overrides.ts
  sync-assets.ts
  sync-firebase.ts
  generate-store-metadata.ts
  generate-env.ts
resources/
  residents/{README.md}          ← icon/splash/fcm יתווספו בהמשך
  suppliers/{README.md}
ios/                             ← קיים, לא נגעים (dev/legacy)
ios-residents/                   ← ייווצר מקומית ע"י המשתמש
ios-suppliers/                   ← ייווצר מקומית ע"י המשתמש
.env, .env.residents, .env.suppliers
```

---

## מה יבוצע בשלב 2 (אחרי אישור)

1. `app-profiles.config.ts` עם residents + suppliers מלאים.
2. `capacitor.config.ts` דינמי + שמירת `capacitor.config.dev.ts` להוט־רילוד הקיים.
3. כל 9 ה־generators תחת `scripts/`.
4. `src/config/features.ts`.
5. עדכון `package.json` בסקריפטים גנריים.
6. `.env.residents`, `.env.suppliers`.
7. תיקיות `resources/residents`, `resources/suppliers` עם README.
8. הוראות מדויקות למשתמש להרצת `app:add-ios` פעמיים.

## מה לא יבוצע
- לא ניגע ב־`ios/` הקיימת.
- לא ניצור icons/splash — רק structure.
- לא נוסיף `isFeatureEnabled(...)` בעמודים קיימים (רק תשתית).
- לא נשנה schema של Supabase.
- לא נשנה קוד עסקי, ראוטים או UI.
- לא נריץ `cap add ios` מ־Lovable — אין Xcode בסביבה.

לאשר לבצע?
