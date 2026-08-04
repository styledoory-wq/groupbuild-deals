import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native "Continue with Google" for the Capacitor builds (iOS/Android).
 *
 * WHY THIS EXISTS
 * ---------------
 * `supabase.auth.signInWithOAuth` navigates the WebView itself to Google, which
 * makes the app look like it "left" and opened a website (and Apple rejects
 * in-WebView OAuth). Instead we request the provider URL without redirecting,
 * open it in the system in-app browser sheet (SFSafariViewController /
 * Custom Tabs), and catch the Universal Link callback to finish the session
 * inside the app.
 */

const NATIVE_CALLBACK_URL = "https://www.groupbuild.co.il/auth/native-callback";

export function shouldUseNativeGoogleSignIn(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type NativeGoogleResult = { ok: boolean; cancelled?: boolean; message?: string };

export async function signInWithGoogleNative(): Promise<NativeGoogleResult> {
  let Browser: typeof import("@capacitor/browser").Browser;
  let App: typeof import("@capacitor/app").App;
  try {
    ({ Browser } = await import("@capacitor/browser"));
    ({ App } = await import("@capacitor/app"));
  } catch {
    return { ok: false, message: "התחברות עם Google אינה זמינה בגרסה זו" };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_CALLBACK_URL,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data?.url) {
    return { ok: false, message: error?.message ?? "ההתחברות עם Google נכשלה" };
  }

  return new Promise<NativeGoogleResult>((resolve) => {
    let settled = false;
    const finish = async (result: NativeGoogleResult) => {
      if (settled) return;
      settled = true;
      try { await listener.remove(); } catch { /* ignore */ }
      try { await Browser.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const listenerPromise = App.addListener("appUrlOpen", async ({ url }) => {
      if (!url || !url.includes("/auth/native-callback")) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) return finish({ ok: false, message: exErr.message });
          return finish({ ok: true });
        }
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sErr) return finish({ ok: false, message: sErr.message });
          return finish({ ok: true });
        }
        return finish({ ok: false, message: parsed.searchParams.get("error_description") ?? "ההתחברות עם Google נכשלה" });
      } catch {
        return finish({ ok: false, message: "ההתחברות עם Google נכשלה" });
      }
    });

    let listener: { remove: () => Promise<void> } = { remove: async () => { /* replaced below */ } };
    listenerPromise.then((l) => { listener = l; });

    Browser.addListener("browserFinished", () => {
      // User dismissed the sheet before completing sign-in.
      finish({ ok: false, cancelled: true });
    });

    Browser.open({ url: data.url, presentationStyle: "popover" }).catch(() =>
      finish({ ok: false, message: "ההתחברות עם Google נכשלה" })
    );
  });
}
