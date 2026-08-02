/**
 * Payment environment + provider resolution.
 *
 * Rules:
 *  - There is exactly ONE source of truth for the provider:
 *    system_settings.active_payment_provider ('stripe' | 'cardcom').
 *    There is NO automatic fallback between providers based on which secrets
 *    happen to exist.
 *  - Test and Production are fully separated: separate keys, separate webhook
 *    secrets, separate return URLs. A production key can never be used while
 *    the environment is 'test' and vice versa.
 */

export type PaymentEnvironment = "test" | "production";
export type SupportedProvider = "stripe" | "cardcom";

export const SUPPORTED_PROVIDERS: SupportedProvider[] = ["stripe", "cardcom"];

export function getPaymentEnvironment(): PaymentEnvironment {
  const raw = (Deno.env.get("PAYMENT_ENVIRONMENT") ?? "test").trim().toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "test";
}

/** Public site URL, per environment. */
export function getSiteOrigin(env: PaymentEnvironment): string {
  const specific = env === "production"
    ? Deno.env.get("PUBLIC_SITE_URL_PRODUCTION")
    : Deno.env.get("PUBLIC_SITE_URL_TEST");
  return (specific ?? Deno.env.get("PUBLIC_SITE_URL") ?? "https://groupbuild.co.il").replace(
    /\/+$/,
    "",
  );
}

/**
 * Stripe secret key for the given environment.
 * Returns null when missing OR when the key prefix does not match the
 * environment (guards against using live keys during QA).
 */
export function getStripeSecretKey(env: PaymentEnvironment): string | null {
  const key = env === "production"
    ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
    : Deno.env.get("STRIPE_SECRET_KEY_TEST");
  if (!key) return null;
  const expected = env === "production" ? "sk_live_" : "sk_test_";
  if (!key.startsWith(expected)) {
    console.error(`[payments] STRIPE key prefix mismatch for environment=${env}`);
    return null;
  }
  return key;
}

/** Webhook signing secrets, keyed by environment. Both are checked on inbound events. */
export function getStripeWebhookSecrets(): Array<{ env: PaymentEnvironment; secret: string }> {
  const out: Array<{ env: PaymentEnvironment; secret: string }> = [];
  const test = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
  const live = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");
  if (test) out.push({ env: "test", secret: test });
  if (live) out.push({ env: "production", secret: live });
  return out;
}

export function getCardcomCredentials(
  env: PaymentEnvironment,
): { terminal: string; apiName: string } | null {
  const suffix = env === "production" ? "_LIVE" : "_TEST";
  const terminal = Deno.env.get(`CARDCOM_TERMINAL${suffix}`);
  const apiName = Deno.env.get(`CARDCOM_API_NAME${suffix}`);
  if (!terminal || !apiName) return null;
  return { terminal, apiName };
}

/** True when the configured provider has everything it needs in this environment. */
export function providerIsReady(
  provider: SupportedProvider,
  env: PaymentEnvironment,
): boolean {
  if (provider === "stripe") return !!getStripeSecretKey(env);
  return !!getCardcomCredentials(env);
}
