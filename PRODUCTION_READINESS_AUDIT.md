# GroupBuild Production Readiness Audit

Date: 2026-05-31

## Executive Status

The application is not fully production-ready for a launch that includes real online deposit payments.

Payment architecture decision: approved. GroupBuild deposit payments are for real-world goods and services, so Apple In-App Purchase is not required. The production architecture should use an external payment provider such as Cardcom, Grow, Stripe, or another local processor, with payment status confirmed only by a secured server webhook.

Two launch-blocking security issues were fixed during this audit:

- `payment-webhook` now requires `PAYMENT_WEBHOOK_SECRET`, validates provider/deposit/transaction consistency, rejects deleted or missing deposits, and handles duplicate paid webhooks idempotently.
- `create-deposit` no longer trusts client-supplied amounts, validates the caller against RLS-visible active deals, derives the amount from the deal, blocks duplicate active deposits, and logs missing provider configuration without creating fake failed deposits.

Remaining launch blocker: the real Cardcom/Grow/Stripe payment provider adapter is still not implemented and cannot create a real payment URL. If deposit payment is part of launch, this must be completed before production.

P1 status after the continuation audit: all identified P1 application issues have been addressed in code or reclassified to P2 where existing controls already reduce launch risk.

## P0 - Must Fix Before Launch

### P0.1 Real external deposit provider integration is incomplete

Area: Deposit payment flow

Status: Open / blocked by provider credentials and final API details.

`supabase/functions/create-deposit/index.ts` still has placeholder implementations for `createGrowPayment` and `createCardcomPayment`. A Stripe implementation also does not exist yet.

Impact: users cannot complete a real online deposit payment. The app can create or reuse deposit records, but it cannot redirect to a real provider payment page.

Required fix: choose one provider for launch, implement its checkout creation API call, store provider transaction IDs, configure production secrets, and test success/failure/cancel webhook flows end-to-end.

### P0.2 Payment webhook did not require authentication

Area: Deposit payment flow, Supabase security

Status: Fixed.

Before this audit, `payment-webhook` was effectively public and could update deposit status through service-role access. It now requires `PAYMENT_WEBHOOK_SECRET`, rejects invalid providers, verifies the deposit exists and belongs to the requested provider, and rejects mismatched transaction IDs.

Remaining hardening: replace or supplement the shared secret with native Grow/Cardcom signature verification once the exact provider contract is available.

### P0.3 Deposit creation trusted unsafe client input

Area: Deal joining, deposit payment flow, Supabase security

Status: Fixed.

Before this audit, `create-deposit` accepted a client amount and used service-role writes without first proving that the caller could see and join the active deal. It now ignores client amount, checks the active deal through the caller's RLS scope, derives the amount from `deals.deposit_amount`, blocks already-paid deposits, reuses existing pending payment URLs, and avoids creating a deposit when payment provider secrets are missing.

### P0.4 Client deposit flow must be wired to external provider checkout

Area: Deal joining, deposit payment flow

Status: Open until provider integration is implemented.

The resident deal join screen still creates a pending deposit record as part of the current reservation flow. For production card payments, the client must call `create-deposit`, redirect to the returned external payment URL, and rely on `payment-webhook` for `paid` status.

## P1 - Critical

### P1.1 Supplier lead email function can be abused

Area: Notifications, supplier leads, Supabase security

Status: Fixed.

`supabase/functions/send-email/index.ts` no longer accepts arbitrary supplier and lead fields for `new_lead`. It now requires a real `deal_interests.id`, loads the deal and supplier server-side, derives lead details from the database, escapes dynamic HTML, and verifies the caller is the lead owner, supplier owner, or admin.

Client update: `src/pages/resident/DealDetail.tsx` now stores the inserted/existing interest id and passes only `interest_id` to the email function.

### P1.2 Admin notification function accepts untrusted calls

Area: Notifications

Status: Fixed.

`supabase/functions/notify-admin/index.ts` now requires an authenticated Supabase user, validates the event type, and scrubs sensitive fields such as email, phone, and name from server logs.

### P1.3 Admin authorization is split between hardcoded email and database roles

Area: Authentication, dashboard functionality, Supabase security

Status: Fixed.

Admin checks now query `user_roles` through `hasAdminRole`. The hardcoded owner email remains only as a bootstrap fallback for the original owner account. Updated files:

- `src/lib/auth.ts`
- `src/store/AppStore.tsx`
- `src/components/auth/RequireAdmin.tsx`
- `src/pages/admin/AdminLogin.tsx`

### P1.4 Suppliers can mark deposit records as paid through lead approval

Area: Deposit payment flow, supplier dashboard

Status: Fixed.

A new migration, `supabase/migrations/20260531190000_external_payment_lead_approval.sql`, changes `approve_lead_and_deposit` so supplier lead approval no longer marks pending deposits as `paid`. Deposit `paid` status is reserved for verified payment webhook updates or admin-only manual action.

### P1.5 Registration workflows need stronger abuse controls

Area: Resident registration, supplier registration

Status: Reclassified to P2.

Current launch risk is reduced because Supabase Auth handles the signup boundary and suppliers are created in `pending` state. Deal creation is blocked unless the supplier is `approved` or `active`. Additional rate limiting and deeper business verification remain important hardening work, but are no longer ranked P1 based on the current approval gate.

## P2 - Important

### P2.1 Login redirect is not fully honored

Area: Authentication, deal joining

Routes send unauthenticated users to `/auth?redirect=...`, but the auth page primarily redirects by role after login. This can drop the user out of the deal-join context.

### P2.2 Terms acceptance update is best-effort

Area: Resident registration, supplier registration

Signup attempts to update terms acceptance metadata after account creation, but failures are swallowed. This should be a server-side required state or retried until persisted.

### P2.3 Notification delivery has no durable outbox

Area: Notifications

Several notification flows are best-effort. For production, use a durable notification table/outbox with retry status, provider response, and admin visibility.

### P2.4 Dashboard queries can become slow

Area: Dashboard functionality

Some dashboards aggregate counts through repeated client-side queries. Replace high-traffic aggregates with RPCs, indexed views, or materialized summaries.

### P2.5 Bundle size needs optimization

Area: Mobile responsiveness, performance

The production build passes, but the main `index` chunk is above 500 kB and `SupplierScan` is large. Add more route-level code splitting and manual chunks for scanner/heavy libraries.

### P2.6 Mobile fixed-layout flows need device QA

Area: Mobile responsiveness

Recent bottom navigation and safe-area fixes improve the mobile shell, but final QA is still needed on iPhone with keyboard open, long deal pages, supplier offer editor, resident deal join, and admin dialogs.

### P2.7 Registration abuse hardening

Area: Resident registration, supplier registration

Add additional rate limiting, server-side supplier business validation, and admin review audit logs around onboarding. Existing supplier approval gates reduce this below P1 for launch, but it should be completed before high-volume rollout.

## P3 - Nice To Have

### P3.1 Add end-to-end tests for critical flows

Area: Full application

Add Playwright/Cypress coverage for signup, supplier registration, deal creation, deal joining, deposit payment success/failure, dashboards, and mobile nav.

### P3.2 Update Browserslist database

Area: Build hygiene

The build reports old Browserslist data. This is not launch-blocking, but should be updated during routine maintenance.

### P3.3 Improve user-facing error copy

Area: UX

Some flows still expose generic or technical error states. Normalize user-facing Hebrew copy and keep diagnostic details in logs.

## Verification Performed

- `npm run build` passed.
- `npm test` passed: 2 test files, 5 tests.
- `git diff --check` passed.
- Deno is not installed in this local environment, so Edge Functions were not Deno type-checked locally.

Additional verification after P1 fixes:

- `npm run build` passed.
- `npm test` passed: 2 test files, 5 tests.
- `git diff --check` passed.
