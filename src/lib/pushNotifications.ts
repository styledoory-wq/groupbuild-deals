// Push notifications registration helper.
// Safe to import in the web build — only calls Capacitor APIs on native platforms.
import { supabase } from "@/integrations/supabase/client";
import { APP_MODE } from "@/config/appMode";

let registered = false;

export async function registerPushNotifications(userId: string): Promise<void> {
  if (registered) return;
  registered = true;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (tok) => {
      const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
      await supabase.from("device_tokens").upsert(
        {
          user_id: userId,
          token: tok.value,
          platform,
          // Which app this token belongs to — decides the APNs topic server-side.
          app_profile: APP_MODE,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });
  } catch (err) {
    console.warn("[push] registration skipped", err);
  }
}
