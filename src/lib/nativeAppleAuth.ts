import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native "Sign in with Apple" for the Capacitor builds (iOS).
 *
 * WHY THIS EXISTS
 * ---------------
 * The managed Lovable OAuth broker works by navigating to the relative path
 * `/~oauth/initiate`, which only exists on Lovable-hosted origins (published
 * site / preview). Inside a native WebView the app is served from the local
 * bundle, so that path resolves to the SPA router and renders the 404 screen.
 *
 * On iOS we therefore use Apple's native ASAuthorization sheet (which Apple
 * also requires for App Store review) and exchange the returned identity token
 * for a Supabase session via `signInWithIdToken`.
 */

function randomNonce(length = 32): string {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** True when native Apple sign-in should be used instead of the web broker. */
export function shouldUseNativeAppleSignIn(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export type NativeAppleResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; message?: string };

export async function signInWithAppleNative(): Promise<NativeAppleResult> {
  let mod: typeof import("@capacitor-community/apple-sign-in");
  try {
    mod = await import("@capacitor-community/apple-sign-in");
  } catch {
    return { ok: false, message: "התחברות עם Apple אינה זמינה בגרסה זו" };
  }

  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  let identityToken: string | undefined;
  let fullName = "";
  try {
    const res = await mod.SignInWithApple.authorize({
      clientId: "il.co.groupbuild.residents",
      redirectURI: "https://www.groupbuild.co.il/auth",
      scopes: "name email",
      state: rawNonce.slice(0, 16),
      nonce: hashedNonce,
    });
    identityToken = res.response?.identityToken ?? undefined;
    fullName = [res.response?.givenName, res.response?.familyName]
      .filter((p): p is string => !!p && !!p.trim())
      .join(" ")
      .trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    // Apple returns error 1001 / "canceled" when the user dismisses the sheet.
    const cancelled = /1001|cancel/i.test(msg);
    return { ok: false, cancelled, message: cancelled ? undefined : "ההתחברות עם Apple נכשלה" };
  }

  if (!identityToken) return { ok: false, message: "ההתחברות עם Apple נכשלה" };

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) return { ok: false, message: error.message };

  // Apple only sends the name on the very first authorization — persist it now.
  if (fullName) {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", uid)
          .maybeSingle();
        if (profile && !profile.full_name?.trim()) {
          await supabase.from("profiles").update({ full_name: fullName }).eq("id", uid);
        }
      }
    } catch {
      /* best-effort */
    }
  }

  return { ok: true };
}
