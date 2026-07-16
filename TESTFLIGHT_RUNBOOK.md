# TestFlight Runbook — GroupBuild (residents) + GroupBuild לעסקים (suppliers)

Two separate apps, one shared backend. **Run every command on a Mac with Xcode ≥ 15 and the `Apple Development` + `Apple Distribution` certificates installed. Nothing here runs from the Lovable sandbox.**

The web build (`npm run build`) and the public site are untouched by any command in this file.

---

## 0. One-time Mac setup (per machine)

```bash
git pull
npm install
```

Verify accounts in Xcode → Settings → Accounts: your Apple ID must be attached to the paid Apple Developer team.

---

## 1. Create the two Xcode projects (one-time, per app)

Each command creates a **separate** native folder (`ios-residents/`, `ios-suppliers/`) with its own Xcode project, its own `Podfile`, its own signing settings. They cannot overwrite each other.

```bash
APP_PROFILE=residents npm run app:add-ios
APP_PROFILE=suppliers npm run app:add-ios
```

After each command, the sync scripts write:

- `Info.plist` — CFBundleDisplayName, version, build number, usage descriptions, custom URL scheme
- `App.entitlements` — Associated Domains + `aps-environment=production`
- Icon/splash sources copied into the profile's `resources/` (see step 2)

The pre-existing `ios/` folder is not touched.

---

## 2. App Icons + Splash Screens (one-time, per app)

Place PNGs at:

```
resources/residents/icon.png    1024×1024, no alpha
resources/residents/splash.png  2732×2732, centered logo on solid bg
resources/suppliers/icon.png    1024×1024, no alpha
resources/suppliers/splash.png  2732×2732
```

Then generate the full asset catalogues:

```bash
APP_PROFILE=residents npx @capacitor/assets generate --ios --assetPath resources/residents
APP_PROFILE=suppliers npx @capacitor/assets generate --ios --assetPath resources/suppliers
```

---

## 3. Signing & Capabilities (per app, in Xcode)

Open each project:

```bash
APP_PROFILE=residents npm run app:open   # opens ios-residents in Xcode
APP_PROFILE=suppliers npm run app:open
```

In the `App` target → Signing & Capabilities:

1. Set **Team** to your paid Apple Developer team.
2. Confirm **Bundle Identifier**:
   - residents → `il.co.groupbuild.residents`
   - suppliers → `il.co.groupbuild.suppliers`
3. Automatic signing ON (or manage a provisioning profile per app if you use manual).
4. Capabilities enabled per app:
   - **Push Notifications** — toggling this in Xcode adds `aps-environment` to the entitlements automatically (development for Debug, production for Distribution). Do not add it manually.
   - Associated Domains → `applinks:groupbuild.co.il` (already written by the sync script)
   - Background Modes → Remote notifications (only if you use silent push)

Repeat for the second app.

---

## 4. App Store Connect records (one-time, in the web UI)

You must create these manually. I can't reach ASC from here.

For each app:

1. Apps → **+** → New App → iOS
2. Bundle ID: pick the exact identifier from step 3
3. Names:
   - residents → **GroupBuild**
   - suppliers → **GroupBuild לעסקים**
4. SKU: `groupbuild-residents-ios` / `groupbuild-suppliers-ios`
5. Primary language: Hebrew
6. Save. **Do not fill App Review yet.** TestFlight only.

Because bundle IDs are different, each Xcode archive uploads to the correct app record automatically.

---

## 5. Pre-upload QA checklist (physical iPhone, per app)

Build & run on a real device before archiving:

```bash
APP_PROFILE=residents npm run app:sync && APP_PROFILE=residents npm run app:open
# In Xcode: select device, ⌘R
```

Manual checks — **each app separately**:

| # | Check | residents | suppliers |
|---|---|---|---|
| 1 | Splash appears with correct color + logo | | |
| 2 | Signup with email + Google | ✓ | ✓ |
| 3 | Login, then force-quit → session restored | ✓ | ✓ |
| 4 | Logout returns to auth screen | ✓ | ✓ |
| 5 | Upload photo from library (Storage insert) | ✓ | ✓ |
| 6 | Realtime: create a row on web, appears in app | ✓ | ✓ |
| 7 | Deep link opens correct screen (`groupbuild.co.il/r/...` residents; `/b/...` suppliers) | ✓ | ✓ |
| 8 | Camera permission prompt has correct Hebrew text | ✓ | ✓ |
| 9 | RTL layout intact everywhere (no LTR bleed) | ✓ | ✓ |
| 10 | **residents build has NO supplier routes** (try `/supplier/dashboard` → NotFound) | ✓ | — |
| 11 | **suppliers build has NO resident routes** (try `/resident/dashboard` → NotFound) | — | ✓ |
| 12 | Push permission prompt appears when relevant | ✓ | ✓ |

Guards 10/11 are enforced at build time via `VITE_APP_MODE` (`src/config/appMode.ts`) — the code is not shipped.

---

## 6. Archive & Upload — residents FIRST

```bash
APP_PROFILE=residents npm run app:sync
APP_PROFILE=residents npm run app:open
# In Xcode: Product → Archive → Distribute App → App Store Connect → Upload
```

Then in App Store Connect → your residents app → TestFlight:

1. Wait for **Processing** to finish (email arrives, usually 5–20 min).
2. Answer the Export Compliance question (No, since `ITSAppUsesNonExemptEncryption=false`).
3. Add yourself as an internal tester and install via the TestFlight app.
4. Run the same checklist from step 5 on the TestFlight build.

**Only after residents passes internal testing**, repeat for suppliers:

```bash
APP_PROFILE=suppliers npm run app:sync
APP_PROFILE=suppliers npm run app:open
# Product → Archive → Distribute → Upload
```

---

## 7. Privacy Manifest, App Privacy, and permissions

Already handled by the sync scripts:

- `PrivacyInfo.xcprivacy` generated per profile from `app-profiles.config.ts` → `privacyManifest`
- `Info.plist` contains only usage descriptions that the app actually needs (see `iosUsageDescriptions` in the registry)
- No tracking APIs are declared (`trackingEnabled: false`)

In App Store Connect → App Privacy, declare the same data types listed in `privacyManifest.collectedDataTypes` for each app.

---

## 8. Report template — fill after each upload

```
App: GroupBuild (residents) | GroupBuild לעסקים (suppliers)
Version:                1.0.0
Build number:           1
Bundle ID:              il.co.groupbuild.<residents|suppliers>
Team / signing:         Automatic — <Team Name> — Apple Distribution
Archive status:         Succeeded / Failed
Upload status:          Uploaded / Processing / Ready to test
Issues found:           <bullet list, or "none">
Still missing for App Review:
  - Screenshots (6.7" + 6.5" + 5.5", per language)
  - Age rating questionnaire
  - App Privacy questionnaire
  - Description / keywords / support URL (already in registry, use fastlane deliver)
  - Sign-in Apple ID for reviewer (test account)
  - Demo notes (Hebrew UI, RTL, main flows)
```

---

## Guardrails (already in place)

- Web build (`npm run build`) and the public site are NOT affected by any command above.
- Supabase URL, keys, schema, RLS, edge functions — untouched.
- Push isolation via `push_tokens.app_variant` still needs a migration + verification before production push traffic is enabled — do that as a separate step before App Review.
- Nothing is submitted to App Review without your explicit approval.
