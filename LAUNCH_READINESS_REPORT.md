# GroupBuild Launch Readiness Report

Date: 2026-05-31

This report lists only items that still affect a real production launch.

## 1. Remaining P0 Launch Blockers

### External payment provider checkout is not implemented

- Status: Missing
- File / area: `supabase/functions/create-deposit/index.ts`
- Risk level: P0
- Risk: residents cannot complete a real production deposit payment.
- What must be done next: choose one launch provider, implement checkout creation, return a real `payment_url`, store provider transaction IDs, and test success/cancel/failure flows.

### Resident deposit flow is not fully connected to provider checkout

- Status: Missing
- File / area: `src/pages/resident/DealDetail.tsx`
- Risk level: P0
- Risk: the app still creates a pending reservation/deposit record as part of the join flow, but production payment must redirect residents to the external provider checkout and wait for webhook confirmation.
- What must be done next: after provider checkout exists, call `create-deposit` from the join flow, open the returned external payment URL, and keep `paid` status dependent on `payment-webhook`.

### Payment webhook uses shared secret but not provider-native signature verification

- Status: Needs verification
- File / area: `supabase/functions/payment-webhook/index.ts`
- Risk level: P0 if provider requires native signature validation; otherwise P1 hardening
- Risk: `PAYMENT_WEBHOOK_SECRET` blocks unauthenticated webhook calls, but final production compliance depends on the exact provider webhook security model.
- What must be done next: verify Cardcom/Grow/Stripe webhook signing requirements and add native signature validation where supported.

## 2. Remaining P1 Critical Issues

### Previously identified P1 issues

- Status: Done
- File / area:
  - `supabase/functions/send-email/index.ts`
  - `supabase/functions/notify-admin/index.ts`
  - `src/lib/auth.ts`
  - `src/store/AppStore.tsx`
  - `src/components/auth/RequireAdmin.tsx`
  - `src/pages/admin/AdminLogin.tsx`
  - `src/pages/supplier/SupplierLeads.tsx`
  - `supabase/migrations/20260531190000_external_payment_lead_approval.sql`
- Risk level: P1 resolved
- Risk: no remaining known P1 blocker from the current audit.
- What must be done next: deploy the updated functions and apply migrations, then verify manually in production/staging.

## 3. Payment Provider Integration Requirements

### Processing fee accounting

- Status: Needs provider verification
- File / area:
  - `supabase/migrations/20260531194000_deposit_fee_accounting.sql`
  - `supabase/functions/payment-webhook/index.ts`
  - `src/pages/admin/AdminPaymentSettings.tsx`
  - `src/pages/admin/AdminDeposits.tsx`
- Risk level: P0 for financial correctness
- Required behavior:
  - Resident absorbs fee: resident is charged deposit plus processing fee; supplier credit/deduction uses net deposit.
  - Supplier absorbs fee: resident is charged deposit only; supplier credit/deduction uses net after provider fee.
  - GroupBuild absorbs fee: resident is charged deposit only; supplier credit/deduction uses gross deposit and GroupBuild absorbs the provider fee.
- What must be done next: verify the selected provider returns actual gross paid amount and processing fee in webhook payloads, or schedule reconciliation while `payment_processing_fee_status` remains `unknown` / `pending`.

### Provider choice

- Status: Missing
- File / area: payment provider configuration and `system_settings.active_payment_provider`
- Risk level: P0
- What must be done next: select one launch provider: Cardcom, Grow, or Stripe. Do not launch with multiple incomplete providers.

### Checkout creation

- Status: Missing
- File / area: `supabase/functions/create-deposit/index.ts`
- Risk level: P0
- What must be done next: implement one provider adapter:
  - create payment session / low profile / payment process
  - pass amount from `deals.deposit_amount`
  - pass deposit id as provider return value / charge identifier
  - save `provider_payment_url`
  - save `provider_transaction_id`

### Webhook confirmation

- Status: Needs verification
- File / area: `supabase/functions/payment-webhook/index.ts`
- Risk level: P0
- What must be done next: configure provider webhook URL, verify signature/secret, map provider statuses to `pending`, `paid`, `failed`, `cancelled`, `refunded`, and test idempotent duplicate webhooks.

### Success and cancel returns

- Status: Missing
- File / area:
  - `src/pages/payment/PaymentSuccess.tsx`
  - `src/pages/payment/PaymentCancel.tsx`
  - provider dashboard
- Risk level: P0
- What must be done next: configure provider success/cancel URLs and verify they return users to the app/web while backend status comes only from webhook.

## 4. Required Environment Variables / Secrets

### Frontend

- Status: Needs verification
- File / area: build/deploy environment
- Risk level: P0
- Required:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- What must be done next: verify production values point to the production Supabase project.

### Supabase Edge Functions

- Status: Needs verification
- File / area: Supabase function secrets
- Risk level: P0
- Required:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PAYMENT_WEBHOOK_SECRET`
- What must be done next: configure all in Supabase secrets. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.

### Email

- Status: Needs verification
- File / area: `supabase/functions/send-email/index.ts`
- Risk level: P1
- Required:
  - `RESEND_API_KEY`
- What must be done next: configure verified production sender/domain before relying on transactional email.

### Grow, if selected

- Status: Missing unless Grow is chosen and configured
- File / area: `supabase/functions/create-deposit/index.ts`
- Risk level: P0
- Required:
  - `GROW_API_KEY`
  - `GROW_PAGE_CODE`
  - `GROW_USER_ID`
- What must be done next: add any additional Grow secrets required by the final API contract.

### Cardcom, if selected

- Status: Missing unless Cardcom is chosen and configured
- File / area: `supabase/functions/create-deposit/index.ts`
- Risk level: P0
- Required:
  - `CARDCOM_TERMINAL_NUMBER`
  - `CARDCOM_API_NAME`
- What must be done next: add any additional Cardcom password/API/signature fields required by the final API contract.

### Stripe, if selected

- Status: Missing
- File / area: new Stripe adapter in `supabase/functions/create-deposit/index.ts`
- Risk level: P0
- Required:
  - Stripe secret key
  - Stripe webhook signing secret
- What must be done next: add Stripe adapter and update webhook parser if Stripe is selected.

## 5. Required Supabase Migrations

### All local migrations must be applied to production

- Status: Needs verification
- File / area: `supabase/migrations`
- Risk level: P0
- What must be done next: apply all unapplied migrations to the production Supabase project.

### P1 payment safety migration

- Status: Needs verification
- File / area: `supabase/migrations/20260531190000_external_payment_lead_approval.sql`
- Risk level: P1
- What must be done next: verify this migration is applied. It prevents supplier lead approval from marking deposits as `paid`.

## 6. Required App Store / Play Store Review Notes

### Apple App Store

- Status: Needs verification
- File / area: App Store Connect review notes
- Risk level: P0 for app approval
- Required note: GroupBuild deposit payments are reservation/commitment fees for real-world goods and services supplied outside the app. They are not digital content, subscriptions, credits, or app feature unlocks. External payment providers are used because Apple In-App Purchase is not required for physical goods and real-world services.
- What must be done next: include demo account credentials, explain the supplier/resident roles, and provide a test deal/payment path.

### Google Play

- Status: Needs verification
- File / area: Google Play Console review notes
- Risk level: P0 for app approval
- Required note: deposit payments are for real-world purchases/services, so Google Play Billing is not used.
- What must be done next: include demo account credentials and explain that payment status is confirmed by server webhook.

### Web

- Status: Needs verification
- File / area: production web deployment
- Risk level: P0
- What must be done next: verify HTTPS, correct Supabase env values, provider redirect URLs, and webhook endpoint accessibility.

## 7. Required Manual Tests Before Launch

### Authentication

- Status: Needs verification
- Risk level: P0
- What must be done next: test resident signup/login/logout, supplier signup/login/logout, admin login with `user_roles`, reset password, and blocked admin access for non-admin users.

### Resident onboarding and deal joining

- Status: Needs verification
- Risk level: P0
- What must be done next: test resident registration, profile data, join without deposit, join with deposit, duplicate join prevention, login redirect from a deal page, and terms acceptance.

### Supplier onboarding and deal creation

- Status: Needs verification
- Risk level: P0
- What must be done next: test pending supplier restrictions, admin approval, approved supplier deal creation, edit offer, save offer, and supplier dashboard counts.

### Deposit payment

- Status: Missing until provider is implemented
- Risk level: P0
- What must be done next: test create checkout, external payment page, success return, cancel return, failed payment, webhook paid update, duplicate webhook, wrong webhook secret, and provider transaction mismatch.

### Notifications

- Status: Needs verification
- Risk level: P1
- What must be done next: test supplier lead in-app notification, supplier lead email, admin notification, email opt-out settings, and missing `RESEND_API_KEY` behavior.

### Dashboards

- Status: Needs verification
- Risk level: P1
- What must be done next: test resident dashboard, supplier dashboard, admin dashboard, admin users, admin suppliers, admin deals, admin deposits, and role-based access.

### Mobile responsiveness

- Status: Needs verification
- Risk level: P1
- What must be done next: test iPhone Safari, iOS app build, Android Chrome/app build, keyboard open states, bottom navigation, long scrolling pages, modals, supplier offer editor, deal detail, and payment return pages.

## Final Launch Decision

Status: Not ready for real production launch with deposit payments.

Reason: external payment provider checkout is still missing and the resident deposit flow is not yet connected to provider checkout.

Launch can proceed only after one external provider is fully implemented, configured, deployed, migrated, and manually tested end-to-end.
