// Native push (iOS/Android) helper for manual permission flow from the UI.
import { supabase } from "@/integrations/supabase/client";

export type NativePushStatus =
  | "unsupported" // not a native platform
  | "not_enabled" // permission = prompt / prompt-with-rationale
  | "granted" // permission granted + registered
  | "denied"; // user blocked in OS settings

export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function getNativePushStatus(): Promise<NativePushStatus> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return "unsupported";
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") return "granted";
    if (perm.receive === "denied") return "denied";
    return "not_enabled";
  } catch {
    return "unsupported";
  }
}

export type EnableNativePushResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "failed" };

export async function enableNativePush(userId: string): Promise<EnableNativePushResult> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return { ok: false, reason: "unsupported" };

    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === "denied") return { ok: false, reason: "denied" };
    if (perm.receive !== "granted") return { ok: false, reason: "failed" };

    // Attach listeners BEFORE register (idempotent — Capacitor de-dupes internally by handle)
    await PushNotifications.removeAllListeners();
    PushNotifications.addListener("registration", async (tok) => {
      const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
      await supabase.from("device_tokens").upsert(
        {
          user_id: userId,
          token: tok.value,
          platform,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });

    await PushNotifications.register();
    return { ok: true };
  } catch (err) {
    console.warn("[push] enable failed", err);
    return { ok: false, reason: "failed" };
  }
}
