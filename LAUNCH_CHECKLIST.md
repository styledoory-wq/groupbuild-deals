# Launch Checklist

## Must Complete Before Launch

- [x] Choose MVP payment provider flow: Grow through Make.com (`grow_make`).
- [x] Add shared payment provider abstraction for checkout, webhook verification, webhook parsing, and status mapping.
- [x] Implement Make.com + Grow adapter in `supabase/functions/_shared/paymentProviders.ts`.
- [x] Keep direct Grow API, Cardcom, and Stripe as disabled/not implemented placeholders.
- [x] Set `grow_make` as implemented.
- [ ] Wire resident deposit flow in `src/pages/resident/DealDetail.tsx` to call `create-deposit` and open the returned Grow payment URL from Make.
- [ ] Configure Make scenario to create Grow payment links.
- [ ] Configure Make scenario to receive Grow payment notifications.
- [ ] Configure Make scenario to call Supabase `payment-webhook?provider=grow_make` with `MAKE_CALLBACK_SECRET`.
- [ ] Verify `payment-webhook` with real Make/Grow payloads and callback secret validation.
- [ ] Verify provider payload includes gross paid amount and processing fee, or document fee reconciliation timing.
- [ ] Confirm fee policy in admin payment settings: who economically absorbs the processing fee.
- [ ] Verify fee behavior:
  - Resident absorbs: resident is charged deposit plus fee; supplier credit/deduction uses net deposit.
  - Supplier absorbs: resident is charged deposit only; supplier credit/deduction uses net after fee.
  - GroupBuild absorbs: resident is charged deposit only; supplier credit/deduction uses gross deposit.
- [ ] Test later fee reconciliation by updating `payment_processing_fee_amount` and `payment_processing_fee_status`.
- [ ] Set production frontend env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Set Supabase function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_WEBHOOK_SECRET`.
- [ ] Set email secret: `RESEND_API_KEY`.
- [ ] Set Make/Grow MVP function secrets:
  - `MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL`
  - `MAKE_CALLBACK_SECRET`
  - `GROW_MAKE_SUCCESS_URL`
  - `GROW_MAKE_CANCEL_URL`
- [ ] Apply all Supabase migrations, including `20260531190000_external_payment_lead_approval.sql`.
- [ ] Apply `20260531193000_add_stripe_payment_provider.sql` if Stripe remains an allowed provider option.
- [ ] Apply `20260531195000_add_grow_make_payment_provider.sql`.
- [ ] Deploy updated Supabase Edge Functions.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Test resident signup, supplier signup, admin login, deal creation, deal joining, and full deposit payment flow.
- [ ] Test iOS and Android mobile layouts, bottom navigation, modals, keyboard states, and payment return pages.
- [ ] Add App Store review notes explaining deposits are for real-world goods/services and do not require Apple IAP.
- [ ] Add Google Play review notes explaining deposits are for real-world goods/services and do not use Google Play Billing.

## Final Make.com + Grow MVP Setup Guide

### 1. Supabase Secrets

Add these secrets to the production Supabase project:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL`
- `MAKE_CALLBACK_SECRET`
- `GROW_MAKE_SUCCESS_URL`
- `GROW_MAKE_CANCEL_URL`

Recommended format:

- `MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL`: Make custom webhook URL used by `create-deposit`.
- `MAKE_CALLBACK_SECRET`: long random shared secret. Make must send it back when calling Supabase.
- `GROW_MAKE_SUCCESS_URL`: public app/web payment success page.
- `GROW_MAKE_CANCEL_URL`: public app/web payment cancel page.

### 2. Make Callback URL To Supabase

Make must call this URL after Grow notifies Make:

```text
https://<PROJECT_REF>.functions.supabase.co/payment-webhook?provider=grow_make
```

Make must include the callback secret by one of these methods:

```text
Authorization: Bearer <MAKE_CALLBACK_SECRET>
```

or:

```text
x-make-callback-secret: <MAKE_CALLBACK_SECRET>
```

or as query param:

```text
?provider=grow_make&secret=<MAKE_CALLBACK_SECRET>
```

### 3. Success URL

Use this format:

```text
https://<YOUR_DOMAIN>/payment/success
```

The code sends this URL to Make and automatically appends:

```text
?dep=<deposit_id>
```

The success page must never mark a deposit as paid. It may only display status while the webhook updates the database.

### 4. Cancel URL

Use this format:

```text
https://<YOUR_DOMAIN>/payment/cancel
```

The code automatically appends:

```text
?dep=<deposit_id>
```

Cancel return should not mark a deposit as failed by itself. Final status should come from Grow webhook/notify when available.

### 5. Make Scenario Configuration

Create two Make scenarios or one scenario with two webhook entry points.

Scenario A: create Grow payment link

1. Trigger: Custom webhook.
2. URL must be stored as `MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL`.
3. Receive JSON from Supabase containing:
   - `provider`
   - `deposit_id`
   - `chargeIdentifier`
   - `deal_id`
   - `offer_id`
   - `resident_id`
   - `supplier_id`
   - `deposit_amount`
   - `amount`
   - `gross_amount`
   - `currency`
   - `payment_fee_absorber`
   - `customer_email`
   - `customer_name`
   - `resident_email`
   - `resident_name`
   - `resident_phone`
   - `deal_title`
   - `description`
   - `success_url`
   - `cancel_url`
4. Create Grow Payment Link / payment process in Grow.
5. Pass `deposit_id` through Grow as `chargeIdentifier`.
6. Also pass `deposit_id` as `cField1` if Grow supports custom fields.
7. Send the exact `deposit_amount`/`gross_amount` received from Supabase to Grow. Do not use fixed amount mapping in Make.
8. Configure Grow notification URL to call Make Scenario B.
9. Return JSON to Supabase:

```json
{
  "payment_url": "https://...",
  "provider_transaction_id": "optional-grow-process-or-link-id"
}
```

If no stable Grow transaction/process id exists yet, return only `payment_url`.

Scenario B: Grow payment notification to Supabase

1. Trigger: webhook/notification from Grow.
2. Extract:
   - `deposit_id` from Grow `chargeIdentifier` or `cField1`
   - `provider_transaction_id` from Grow transaction/process id
   - payment status
   - gross paid amount
   - processing fee if Grow provides it
   - currency
3. Call Supabase:

```text
POST https://<PROJECT_REF>.functions.supabase.co/payment-webhook?provider=grow_make
Authorization: Bearer <MAKE_CALLBACK_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "deposit_id": "<deposit uuid>",
  "provider_transaction_id": "<grow transaction id>",
  "status": "paid",
  "gross_amount": 1000,
  "processing_fee": 12.34,
  "currency": "ILS"
}
```

If Grow does not provide the fee immediately, omit `processing_fee`; Supabase will keep `payment_processing_fee_status = unknown`.

### 6. Grow Dashboard / Account Configuration

Confirm with Grow:

- Production account is active.
- Payment Link / payment process creation is available to Make.
- Notify/webhook calls are enabled for payment success and failure.
- Grow notification points to the Make Scenario B webhook, not directly to Supabase.
- Make passes our `deposit_id` into Grow as `chargeIdentifier`.
- Grow returns `chargeIdentifier` back to Make.
- Grow returns `transactionId` or stable process id in webhook payload.
- Grow returns a status field such as `statusCode`.
- Grow can return gross paid amount in webhook payload.
- Grow can return processing fee/commission in webhook payload, or confirms that fee is available only later in settlement reports.

### 7. Real End-to-End Deposit Test

1. Apply all Supabase migrations.
2. Deploy updated Supabase Edge Functions.
3. Set `system_settings.active_payment_provider = grow_make`.
4. Set payment fee absorber in Admin Payment Settings.
5. Create or use an active deal with `deposit_required = true` and a positive `deposit_amount`.
6. Sign in as a resident.
7. Join the deal.
8. Trigger `create-deposit`.
9. Confirm a pending row exists in `deposits`.
10. Open the returned Grow payment URL created by Make.
11. Complete payment with a real/test card approved by Grow.
12. Wait for webhook.
13. Confirm deposit changes to `paid`.

### 8. Verify Paid Status Comes Only From Make Callback

Check:

- Returning to `GROW_MAKE_SUCCESS_URL` does not update `deposits.status`.
- `deposits.status` changes to `paid` only after Make calls `payment-webhook?provider=grow_make` with the shared secret.
- `paid_at` is set only on the webhook/admin update path.
- `provider_transaction_id` is set from the Grow webhook or checkout response.

### 9. Verify Deposit ID, Amount, And Transaction Matching

Check in `deposits`:

- `id` equals Grow `chargeIdentifier`.
- Make callback sends the same `deposit_id`.
- Make callback sends `gross_amount` equal to `deposits.gross_deposit_amount`.
- Make callback sends non-empty `provider_transaction_id`.
- Grow transaction/process id matches existing `provider_transaction_id` if one was already saved.
- A callback with missing deposit id, mismatched amount, missing transaction id, wrong provider, or mismatched transaction id is rejected.

### 10. Failed / Cancelled Payments

Expected handling:

- User cancel return: show cancel screen only; do not mark paid.
- Make failure callback: send `status = failed`.
- Make pending callback: send `status = pending`.
- Make cancelled callback: send `status = cancelled`.
- Duplicate paid webhook: should be idempotent.
- Refund webhook, if Grow supports it: map to `refunded` only after verifying exact payload fields with Grow.

### 11. If Payment Link Creation Fails

Check in this order:

1. Supabase function logs for `provider_not_configured`, `make_checkout_failed`, or `make_missing_payment_url`.
2. `MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL` exists and points to the correct Make scenario.
3. `MAKE_CALLBACK_SECRET` exists in Supabase and Make.
4. `GROW_MAKE_SUCCESS_URL` and `GROW_MAKE_CANCEL_URL` are public HTTPS URLs.
5. Make scenario successfully creates a Grow payment link.
6. The deal is active, not deleted, requires deposit, and has positive `deposit_amount`.
7. The resident is authenticated.
8. There is no existing paid deposit for the same resident/deal.
9. Make response includes `payment_url`.
10. If Make/Grow returns validation errors, inspect Make run history and Grow response body.

## Message To Send To Grow Support

```text
Hello Grow support,

We are integrating Grow Light API createPaymentProcess for production deposit payments in our marketplace app GroupBuild.

Payments are reservation/deposit payments for real-world goods and services.

Please confirm the exact production API details we should use:

1. Production endpoint URL for createPaymentProcess.
2. Required request fields for createPaymentProcess.
3. Exact credential names/values we need: API key, pageCode, userId, or any other required secret.
4. Which request field should we use to pass our internal deposit id? We plan to send it as chargeIdentifier and also cField1.
5. Exact response fields that contain:
   - payment page URL
   - process id / transaction id
6. Exact webhook/notify payload fields for:
   - chargeIdentifier
   - transactionId or process id
   - payment status / statusCode
   - gross amount paid by customer
   - processing fee / commission charged by Grow
   - currency
7. Do you support webhook signature verification or a shared secret header/query parameter?
8. Are webhook retries sent for failed delivery?
9. Which status values mean paid, pending, failed, cancelled, and refunded?
10. Can Grow support customer-paid processing fee/surcharge, or should processing fees be absorbed by supplier/merchant/platform?

We need these details so our backend can mark deposits as paid only from verified webhooks and correctly store gross amount, processing fee, and net amount.

Thank you.
```
