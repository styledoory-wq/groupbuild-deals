# Notifications — Setup & Required Secrets

This document lists everything required to enable real notification delivery.
The infrastructure (DB tables, preferences UI, edge functions) is already in
place and degrades gracefully when credentials are missing.

## Channels

| Channel | Status | Required to activate |
|---|---|---|
| Email | ✅ Active (Resend, `onboarding@resend.dev`) | Verified Resend domain for branded sender |
| Push (iOS) | 🟡 Skeleton — logs only | APNs `.p8` key + Team ID + Key ID + Bundle ID |
| Push (Android) | 🟡 Skeleton — logs only | FCM Service Account JSON |
| SMS | ⛔ Disabled (architecture ready) | Provider (Twilio / Vonage) credentials |

## Required Secrets

Add these in **Lovable Cloud → Secrets**:

### Email (already partially configured)
- `RESEND_API_KEY` ✅ already configured
- **Verified Resend domain** — currently sending from `onboarding@resend.dev`.
  Add a domain at https://resend.com/domains and update the `FROM` constant in
  `supabase/functions/send-email/index.ts` (e.g. `GroupBuild <noreply@notify.groupbuild.co.il>`).

### Push — iOS (APNs)
- `APNS_P8_KEY` — full contents of the `.p8` file from Apple Developer
- `APNS_TEAM_ID` — your Apple Developer Team ID
- `APNS_KEY_ID` — the Key ID associated with the `.p8`
- `APNS_BUNDLE_ID` — iOS app bundle id (matches `capacitor.config.ts`)

### Push — Android (FCM)
- `FCM_SERVICE_ACCOUNT_JSON` — full JSON of a Firebase service account key
  with FCM permissions

### SMS (future)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## How the system behaves without credentials

- **send-email** keeps working with the existing Resend setup.
- **send-push** returns `{ success: true, warning: "push_credentials_not_configured" }`
  and logs a clear console warning. The app does **not** crash and existing
  flows are not blocked.
- **SMS** is intentionally disabled in code — the toggles in the UI are
  hidden until SMS is wired up.

## After adding credentials

1. Add the secrets above.
2. Implement real APNs/FCM dispatch in `supabase/functions/send-push/index.ts`
   (the file is structured so this is a focused change — replace the
   `would_send_*` block with real `fetch` calls).
3. Re-deploy the edge function. Done.
