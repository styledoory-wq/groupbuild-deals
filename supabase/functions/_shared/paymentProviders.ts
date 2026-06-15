export type PaymentProviderKey = "grow" | "grow_make" | "cardcom" | "stripe";
export type DepositStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export interface CheckoutSessionInput {
  depositId: string;
  dealId: string;
  offerId: string | null;
  residentId: string;
  supplierId: string;
  amount: number;
  currency: "ILS";
  paymentFeeAbsorber: "resident" | "supplier" | "groupbuild";
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  dealTitle: string | null;
  description: string | null;
}

export interface CheckoutSessionResult {
  payment_url: string | null;
  provider_transaction_id: string | null;
  pending?: boolean;
  raw_response?: unknown;
}

export interface ParsedWebhookEvent {
  depositId: string | null;
  providerTxnId: string | null;
  providerStatus: string | number | null;
  depositStatus: DepositStatus;
  grossAmount: number | null;
  processingFeeAmount: number | null;
  processingFeeStatus: "unknown" | "pending" | "estimated" | "final";
  currency: string | null;
  raw: unknown;
}

export class PaymentProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
    public missingSecrets: string[] = [],
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

export interface PaymentProviderAdapter {
  key: PaymentProviderKey;
  implemented: boolean;
  requiredSecrets: string[];
  getMissingSecrets(): string[];
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(input: {
    req: Request;
    url: URL;
    rawBody: string;
  }): Promise<boolean>;
  parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent;
  mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus;
}

function missingSecrets(requiredSecrets: string[]): string[] {
  return requiredSecrets.filter((key) => !Deno.env.get(key));
}

function numberFromPayload(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function amountFromMinorUnits(value: unknown): number | null {
  const n = numberFromPayload(value);
  return n === null ? null : n / 100;
}

function stringFromPayload(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function appendQueryParam(urlValue: string, key: string, value: string): string {
  const url = new URL(urlValue);
  url.searchParams.set(key, value);
  return url.toString();
}

function extractNestedRecord(payload: Record<string, unknown>): Record<string, unknown> {
  return (payload.data as Record<string, unknown>) ??
    (payload.payment as Record<string, unknown>) ??
    (payload.paymentProcess as Record<string, unknown>) ??
    payload;
}

function genericSharedWebhookSecretIsValid(req: Request, url: URL): boolean {
  const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");
  if (!webhookSecret) {
    throw new PaymentProviderError(
      "webhook_not_configured",
      "PAYMENT_WEBHOOK_SECRET is not configured",
      503,
      ["PAYMENT_WEBHOOK_SECRET"],
    );
  }

  const suppliedSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret");

  return suppliedSecret === webhookSecret;
}

abstract class PlaceholderProviderAdapter implements PaymentProviderAdapter {
  implemented = false;

  constructor(
    public key: PaymentProviderKey,
    public requiredSecrets: string[],
  ) {}

  getMissingSecrets(): string[] {
    return missingSecrets(this.requiredSecrets);
  }

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const missing = this.getMissingSecrets();
    if (missing.length > 0) {
      throw new PaymentProviderError(
        "provider_not_configured",
        "Payment provider secrets are missing",
        409,
        missing,
      );
    }

    throw new PaymentProviderError(
      "provider_not_implemented",
      `${this.key} checkout adapter is not implemented yet`,
      501,
    );
  }

  async verifyWebhookSignature(input: {
    req: Request;
    url: URL;
    rawBody: string;
  }): Promise<boolean> {
    void input.rawBody;
    return genericSharedWebhookSecretIsValid(input.req, input.url);
  }

  abstract parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent;
  abstract mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus;
}

class GrowProviderAdapter extends PlaceholderProviderAdapter {
  constructor() {
    super("grow", [
      "GROW_API_BASE_URL",
      "GROW_API_KEY",
      "GROW_PAGE_CODE",
      "GROW_USER_ID",
      "GROW_SUCCESS_URL",
      "GROW_CANCEL_URL",
      "GROW_NOTIFY_URL",
      "PAYMENT_WEBHOOK_SECRET",
    ]);
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const missing = this.getMissingSecrets();
    if (missing.length > 0) {
      throw new PaymentProviderError(
        "provider_not_configured",
        "Grow payment provider secrets are missing",
        409,
        missing,
      );
    }

    if (input.paymentFeeAbsorber === "resident") {
      throw new PaymentProviderError(
        "resident_fee_absorption_not_supported",
        "Grow resident-paid fee mode requires provider-side surcharge configuration before launch",
        409,
      );
    }

    const baseUrl = Deno.env.get("GROW_API_BASE_URL")!;
    const webhookSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET")!;
    const notifyUrl = appendQueryParam(
      appendQueryParam(Deno.env.get("GROW_NOTIFY_URL")!, "provider", "grow"),
      "secret",
      webhookSecret,
    );
    const successUrl = appendQueryParam(Deno.env.get("GROW_SUCCESS_URL")!, "dep", input.depositId);
    const cancelUrl = appendQueryParam(Deno.env.get("GROW_CANCEL_URL")!, "dep", input.depositId);

    const body = new URLSearchParams({
      pageCode: Deno.env.get("GROW_PAGE_CODE")!,
      userId: Deno.env.get("GROW_USER_ID")!,
      apiKey: Deno.env.get("GROW_API_KEY")!,
      sum: input.amount.toFixed(2),
      currency: input.currency,
      description: input.description ?? `GroupBuild deposit ${input.depositId}`,
      transactionTypes: "1",
      chargeIdentifier: input.depositId,
      cField1: input.depositId,
      cField2: input.dealId,
      notifyUrl,
      successUrl,
      cancelUrl,
    });

    if (input.userName) body.set("pageField[fullName]", input.userName);
    if (input.userEmail) body.set("pageField[email]", input.userEmail);

    const endpoint = /createPaymentProcess\/?$/i.test(baseUrl)
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/createPaymentProcess/`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const responseText = await res.text();
    let responseJson: Record<string, unknown>;
    try {
      responseJson = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      throw new PaymentProviderError("grow_invalid_response", "Grow returned a non-JSON response", 502);
    }

    if (!res.ok || isGrowFailureResponse(responseJson)) {
      throw new PaymentProviderError(
        "grow_checkout_failed",
        stringFromPayload(responseJson.err) ??
          stringFromPayload(responseJson.message) ??
          stringFromPayload(responseJson.error) ??
          "Grow checkout creation failed",
        502,
      );
    }

    const data = extractNestedRecord(responseJson);
    const paymentUrl =
      stringFromPayload(data.url) ??
      stringFromPayload(data.payment_url) ??
      stringFromPayload(data.paymentUrl) ??
      stringFromPayload(data.paymentLink) ??
      stringFromPayload(data.processUrl) ??
      stringFromPayload(responseJson.url);
    const providerTxnId =
      stringFromPayload(data.processId) ??
      stringFromPayload(data.processToken) ??
      stringFromPayload(data.paymentProcessId) ??
      stringFromPayload(data.transactionId) ??
      stringFromPayload(responseJson.processId);

    if (!paymentUrl || !providerTxnId) {
      throw new PaymentProviderError("grow_missing_checkout_fields", "Grow response is missing payment URL or process id", 502);
    }

    return {
      payment_url: paymentUrl,
      provider_transaction_id: providerTxnId,
    };
  }

  parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent {
    const data = extractNestedRecord(payload);
    const providerStatus =
      (data.statusCode as string | number | null) ??
      (data.status as string | number | null) ??
      (payload.status as string | number | null) ??
      null;
    const depositStatus = this.mapProviderStatusToDepositStatus(providerStatus);
    const fee =
      numberFromPayload(data.fee) ??
      numberFromPayload(data.commission) ??
      numberFromPayload(data.creditCompanyCommission);

    return {
      depositId:
        stringFromPayload(data.chargeIdentifier) ??
        stringFromPayload(data.cField1) ??
        stringFromPayload(payload.chargeIdentifier) ??
        null,
      providerTxnId:
        stringFromPayload(data.transactionId) ??
        stringFromPayload(data.processId) ??
        stringFromPayload(data.processToken) ??
        stringFromPayload(payload.transactionId) ??
        null,
      providerStatus,
      depositStatus,
      grossAmount:
        numberFromPayload(data.sum) ??
        numberFromPayload(data.amount) ??
        numberFromPayload(data.total),
      processingFeeAmount: fee,
      processingFeeStatus: fee !== null ? "final" : "unknown",
      currency: (data.currency as string) ?? "ILS",
      raw: payload,
    };
  }

  mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus {
    const statusCode = Number(status ?? 0);
    if (statusCode === 1) return "paid";
    if (statusCode === 0) return "pending";
    return "failed";
  }
}

class GrowMakeProviderAdapter extends PlaceholderProviderAdapter {
  constructor() {
    super("grow_make", [
      "MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL",
      "MAKE_CALLBACK_SECRET",
      "GROW_MAKE_SUCCESS_URL",
      "GROW_MAKE_CANCEL_URL",
    ]);
  }

  implemented = true;

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const missing = this.getMissingSecrets();
    if (missing.length > 0) {
      throw new PaymentProviderError(
        "provider_not_configured",
        "Make/Grow payment provider secrets are missing",
        409,
        missing,
      );
    }

    const successUrl = appendQueryParam(Deno.env.get("GROW_MAKE_SUCCESS_URL")!, "dep", input.depositId);
    const cancelUrl = appendQueryParam(Deno.env.get("GROW_MAKE_CANCEL_URL")!, "dep", input.depositId);
    const makePayload = {
      provider: "grow_make",
      deposit_id: input.depositId,
      chargeIdentifier: input.depositId,
      deal_id: input.dealId,
      offer_id: input.offerId,
      resident_id: input.residentId,
      supplier_id: input.supplierId,
      deposit_amount: input.amount,
      amount: input.amount,
      gross_amount: input.amount,
      currency: input.currency,
      payment_fee_absorber: input.paymentFeeAbsorber,
      customer_email: input.userEmail,
      customer_name: input.userName,
      resident_email: input.userEmail,
      resident_name: input.userName,
      resident_phone: input.userPhone,
      deal_title: input.dealTitle,
      description: input.description ?? `GroupBuild deposit ${input.depositId}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    console.log("[grow_make_create_checkout_request]", {
      deposit_id: input.depositId,
      deal_id: input.dealId,
      resident_id: input.residentId,
      supplier_id: input.supplierId,
      deposit_amount: input.amount,
    });

    const res = await fetch(Deno.env.get("MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL")!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("MAKE_CALLBACK_SECRET")!}`,
      },
      body: JSON.stringify(makePayload),
    });

    const responseText = await res.text();
    console.log("[grow_make_create_checkout_response]", {
      deposit_id: input.depositId,
      status: res.status,
      body: responseText,
    });

    const trimmedBody = (responseText ?? "").trim();

    // Make.com returns the literal string "Accepted" (200) when the scenario
    // has no Webhook Response module returning JSON. Detect this and surface
    // a clear, actionable Hebrew error so the operator can fix the scenario.
    if (!trimmedBody || /^accepted$/i.test(trimmedBody)) {
      throw new PaymentProviderError(
        "make_webhook_missing_response_module",
        "תרחיש Make.com לא מחזיר קישור תשלום. יש להוסיף בסוף התרחיש מודול 'Webhook Response' שמחזיר JSON בפורמט { \"payment_url\": \"https://...\" }.",
        502,
      );
    }

    let responseJson: Record<string, unknown>;
    try {
      responseJson = JSON.parse(trimmedBody) as Record<string, unknown>;
    } catch {
      throw new PaymentProviderError(
        "make_invalid_response",
        "תגובת Make.com אינה JSON תקין. ודאו שמודול ה-Webhook Response מחזיר אובייקט JSON עם payment_url.",
        502,
      );
    }

    if (!res.ok || responseJson.error) {
      throw new PaymentProviderError(
        "make_checkout_failed",
        stringFromPayload(responseJson.error) ??
          stringFromPayload(responseJson.message) ??
          "Make failed to create Grow payment link",
        502,
      );
    }

    const paymentUrl =
      stringFromPayload(responseJson.payment_url) ??
      stringFromPayload(responseJson.paymentUrl) ??
      stringFromPayload(responseJson.grow_payment_url) ??
      stringFromPayload(responseJson.url);
    if (!paymentUrl) {
      throw new PaymentProviderError("make_missing_payment_url", "Make response is missing payment_url", 502);
    }

    return {
      payment_url: paymentUrl,
      provider_transaction_id:
        stringFromPayload(responseJson.provider_transaction_id) ??
        stringFromPayload(responseJson.transaction_id) ??
        stringFromPayload(responseJson.grow_transaction_id) ??
        stringFromPayload(responseJson.process_id),
      raw_response: responseJson,
    };
  }

  async verifyWebhookSignature(input: {
    req: Request;
    url: URL;
    rawBody: string;
  }): Promise<boolean> {
    void input.rawBody;
    const callbackSecret = Deno.env.get("MAKE_CALLBACK_SECRET");
    if (!callbackSecret) {
      throw new PaymentProviderError(
        "make_callback_not_configured",
        "MAKE_CALLBACK_SECRET is not configured",
        503,
        ["MAKE_CALLBACK_SECRET"],
      );
    }

    const suppliedSecret =
      input.req.headers.get("x-make-callback-secret") ??
      input.req.headers.get("x-webhook-secret") ??
      input.req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      input.url.searchParams.get("secret");

    return suppliedSecret === callbackSecret;
  }

  parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent {
    const data = extractNestedRecord(payload);
    const providerStatus =
      (data.status as string | number | null) ??
      (data.statusCode as string | number | null) ??
      (data.payment_status as string | number | null) ??
      null;
    const fee =
      numberFromPayload(data.processing_fee) ??
      numberFromPayload(data.processing_fee_amount) ??
      numberFromPayload(data.fee) ??
      numberFromPayload(data.commission);

    return {
      depositId:
        stringFromPayload(data.deposit_id) ??
        stringFromPayload(data.chargeIdentifier) ??
        stringFromPayload(data.cField1) ??
        null,
      providerTxnId:
        stringFromPayload(data.provider_transaction_id) ??
        stringFromPayload(data.transaction_id) ??
        stringFromPayload(data.grow_transaction_id) ??
        stringFromPayload(data.transactionId) ??
        stringFromPayload(data.process_id),
      providerStatus,
      depositStatus: this.mapProviderStatusToDepositStatus(providerStatus),
      grossAmount:
        numberFromPayload(data.gross_amount) ??
        numberFromPayload(data.gross_deposit_amount) ??
        numberFromPayload(data.amount) ??
        numberFromPayload(data.sum),
      processingFeeAmount: fee,
      processingFeeStatus: fee !== null ? "final" : "unknown",
      currency: (data.currency as string) ?? "ILS",
      raw: payload,
    };
  }

  mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus {
    const value = String(status ?? "").toLowerCase();
    if (value === "1" || value === "paid" || value === "success" || value === "approved" || value === "completed") {
      return "paid";
    }
    if (value === "0" || value === "pending" || value === "processing") return "pending";
    if (value === "cancelled" || value === "canceled" || value === "cancel") return "cancelled";
    if (value === "refunded" || value === "refund") return "refunded";
    return "failed";
  }
}

function isGrowFailureResponse(response: Record<string, unknown>): boolean {
  const status = Number(response.status ?? response.success ?? 1);
  if (status === 0) return true;
  if (response.error || response.err) return true;
  return false;
}

class CardcomProviderAdapter extends PlaceholderProviderAdapter {
  constructor() {
    super("cardcom", ["CARDCOM_TERMINAL_NUMBER", "CARDCOM_API_NAME"]);
  }

  parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent {
    const providerStatus = (payload.ResponseCode as string | number | null) ?? null;
    const depositStatus = this.mapProviderStatusToDepositStatus(providerStatus);

    return {
      depositId: (payload.ReturnValue as string) ?? null,
      providerTxnId:
        (payload.TranzactionId as string) ??
        (payload.LowProfileId as string) ??
        null,
      providerStatus,
      depositStatus,
      grossAmount:
        numberFromPayload(payload.Amount) ??
        numberFromPayload(payload.Sum) ??
        numberFromPayload(payload.Total),
      processingFeeAmount:
        numberFromPayload(payload.Fee) ??
        numberFromPayload(payload.Commission) ??
        numberFromPayload(payload.CreditCompanyCommission),
      processingFeeStatus:
        numberFromPayload(payload.Fee) !== null ||
        numberFromPayload(payload.Commission) !== null ||
        numberFromPayload(payload.CreditCompanyCommission) !== null
          ? "final"
          : "unknown",
      currency: (payload.Currency as string) ?? "ILS",
      raw: payload,
    };
  }

  mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus {
    return Number(status ?? -1) === 0 ? "paid" : "failed";
  }
}

class StripeProviderAdapter extends PlaceholderProviderAdapter {
  constructor() {
    super("stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  }

  parseWebhookEvent(payload: Record<string, unknown>): ParsedWebhookEvent {
    const type = (payload.type as string | null) ?? null;
    const data = payload.data as { object?: Record<string, unknown> } | undefined;
    const object = data?.object ?? {};
    const metadata = (object.metadata as Record<string, unknown>) ?? {};
    const providerStatus =
      type ??
      (object.payment_status as string | null) ??
      (object.status as string | null) ??
      null;

    return {
      depositId: (metadata.deposit_id as string) ?? (object.client_reference_id as string) ?? null,
      providerTxnId: (object.payment_intent as string) ?? (object.id as string) ?? null,
      providerStatus,
      depositStatus: this.mapProviderStatusToDepositStatus(providerStatus),
      grossAmount:
        amountFromMinorUnits(object.amount_total) ??
        amountFromMinorUnits(object.amount_paid) ??
        null,
      processingFeeAmount:
        amountFromMinorUnits(object.application_fee_amount) ??
        amountFromMinorUnits(object.fee) ??
        null,
      processingFeeStatus:
        object.application_fee_amount !== undefined || object.fee !== undefined
          ? "final"
          : "unknown",
      currency: typeof object.currency === "string" ? object.currency.toUpperCase() : null,
      raw: payload,
    };
  }

  mapProviderStatusToDepositStatus(status: string | number | null): DepositStatus {
    const value = String(status ?? "").toLowerCase();
    if (value === "checkout.session.completed" || value === "paid" || value === "succeeded") {
      return "paid";
    }
    if (value === "checkout.session.expired" || value === "expired" || value === "canceled") {
      return "cancelled";
    }
    if (value === "charge.refunded" || value === "refunded") {
      return "refunded";
    }
    if (value.includes("failed")) return "failed";
    return "pending";
  }
}

const adapters: Record<PaymentProviderKey, PaymentProviderAdapter> = {
  grow: new GrowProviderAdapter(),
  grow_make: new GrowMakeProviderAdapter(),
  cardcom: new CardcomProviderAdapter(),
  stripe: new StripeProviderAdapter(),
};

export function isPaymentProviderKey(value: string | null | undefined): value is PaymentProviderKey {
  return value === "grow" || value === "grow_make" || value === "cardcom" || value === "stripe";
}

export function getPaymentProvider(provider: string | null | undefined): PaymentProviderAdapter {
  if (!isPaymentProviderKey(provider)) {
    throw new PaymentProviderError(
      "provider_invalid",
      "Payment provider is invalid or unsupported",
      409,
    );
  }
  return adapters[provider];
}
