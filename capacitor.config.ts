import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { APP_PROFILES } from "./app-profiles.config";

/**
 * Capacitor config is derived from the App Profiles Registry.
 *
 * - When APP_PROFILE env var is set (e.g. `APP_PROFILE=residents npx cap sync`),
 *   the config for that profile is used and `ios.path` / `android.path` are
 *   isolated per profile so `cap sync` can NEVER overwrite another profile's
 *   native folder, and never touches the legacy `ios/` or `dist/` paths.
 * - When APP_PROFILE is NOT set:
 *   - Capacitor CLI commands are rejected (would otherwise default to `ios/` + `dist`).
 *   - Lovable / Vite web preview keeps a web-only fallback (no native path).
 */

const profileId = process.env.APP_PROFILE;

/** True when this file is being evaluated by `@capacitor/cli` (sync/copy/open/add). */
const isCapacitorCli = process.argv.some(
  (a) =>
    a.includes("@capacitor/cli") ||
    /(?:^|[/\\])capacitor(?:\.js)?$/.test(a) ||
    // npx / npm bin shim: node_modules/.bin/cap
    /(?:^|[/\\])cap$/.test(a)
);

const buildProfileConfig = (): CapacitorConfig => {
  const p = APP_PROFILES.find((x) => x.id === profileId);
  if (!p) {
    throw new Error(
      `[capacitor.config] Unknown APP_PROFILE="${profileId}". Known: ${APP_PROFILES.map(
        (x) => x.id
      ).join(", ")}`
    );
  }
  if (p.webDir === "dist" || p.iosDir === "ios" || p.androidDir === "android") {
    throw new Error(
      `[capacitor.config] Profile "${p.id}" must not use legacy paths ` +
        `(webDir=dist / iosDir=ios / androidDir=android). ` +
        `Got webDir=${p.webDir}, iosDir=${p.iosDir}, androidDir=${p.androidDir}.`
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

if (isCapacitorCli && !profileId) {
  throw new Error(
    `[capacitor.config] APP_PROFILE is required for Capacitor CLI.\n` +
      `  Example: APP_PROFILE=residents npx cap sync ios\n` +
      `  Or:      npm run app:residents:sync\n` +
      `Native builds must use dist-residents → ios-residents (never dist/ or ios/).`
  );
}

// Web-only fallback for Lovable preview / hot-reload when APP_PROFILE is unset.
// Intentionally omits ios.path / android.path so Cap CLI cannot silently target
// the legacy `ios/` folder — Cap CLI is blocked above when APP_PROFILE is missing.
const legacyDevConfig: CapacitorConfig = {
  appId: "il.co.groupbuild.residents",
  appName: "GroupBuild",
  webDir: "dist",
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
