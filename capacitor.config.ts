import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { APP_PROFILES } from "./app-profiles.config";

/**
 * Capacitor config is derived from the App Profiles Registry.
 *
 * - When APP_PROFILE env var is set (e.g. `APP_PROFILE=residents npx cap sync`),
 *   the config for that profile is used and `ios.path` / `android.path` are
 *   isolated per profile so `cap sync` can NEVER overwrite another profile's
 *   native folder.
 * - When APP_PROFILE is NOT set (Lovable hot-reload / dev), the legacy config
 *   is used unchanged (appId com.groupbuild.app, webDir dist, ios/ folder).
 *   This preserves the current Lovable preview behavior exactly.
 */

const profileId = process.env.APP_PROFILE;

const buildProfileConfig = (): CapacitorConfig => {
  const p = APP_PROFILES.find((x) => x.id === profileId);
  if (!p) {
    throw new Error(
      `[capacitor.config] Unknown APP_PROFILE="${profileId}". Known: ${APP_PROFILES.map(
        (x) => x.id
      ).join(", ")}`
    );
  }
  return {
    appId: p.appId,
    appName: p.appName,
    webDir: p.webDir,
    ios: {
      path: p.iosDir,
      contentInset: "never",
      scheme: p.appName,
    },
    android: {
      path: p.androidDir,
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        launchAutoHide: true,
        backgroundColor: p.splashBackgroundColor,
        androidSplashResourceName: "splash",
        androidScaleType: "CENTER_CROP",
        showSpinner: false,
        splashFullScreen: true,
        splashImmersive: true,
      },
      Keyboard: {
        resize: KeyboardResize.Native,
        style: KeyboardStyle.Dark,
        resizeOnFullScreen: true,
      },
      PushNotifications: {
        presentationOptions: ["badge", "sound", "alert"],
      },
    },
  };
};

// Web-only dev fallback (Lovable preview / hot-reload) when APP_PROFILE is unset.
// No native folder is referenced here — native builds must set APP_PROFILE.
const legacyDevConfig: CapacitorConfig = {
  appId: "il.co.groupbuild.residents",
  appName: "GroupBuild",
  webDir: "dist",
  ios: {
    contentInset: "never",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#F7F5F0",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

const config: CapacitorConfig = profileId ? buildProfileConfig() : legacyDevConfig;

export default config;
