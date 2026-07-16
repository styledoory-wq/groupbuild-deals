# App Profile Resources

Each subdirectory here corresponds to a profile in `app-profiles.config.ts`
and holds the per-app native assets.

Expected files per profile (e.g. `resources/residents/`):

| File | Purpose | Size |
|---|---|---|
| `icon.png` | App icon | 1024×1024 (opaque) |
| `splash.png` | Splash screen | 2732×2732 (opaque, centered logo) |
| `google-services.json` | Firebase / FCM config (Android) | — |
| `GoogleService-Info.plist` | Firebase config (iOS, optional) | — |

Files here are NEVER committed as binaries into the app codebase — they are
copied into the per-profile native folder (`ios-<id>/`, `android-<id>/`) by
`scripts/sync-assets.ts` at build time. They belong to the corresponding
profile ONLY — no cross-profile writes.

## Adding a new profile

1. Add an entry to `APP_PROFILES` in `app-profiles.config.ts`.
2. Create `resources/<id>/` and drop `icon.png` + `splash.png` in it.
3. Run `APP_PROFILE=<id> npm run app:add-ios` once, locally (needs Xcode).
