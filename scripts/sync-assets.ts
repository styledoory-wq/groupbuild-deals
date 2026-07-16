/**
 * Copies per-profile icon.png / splash.png / Firebase config into the
 * profile's native folder ONLY. Never touches other profiles.
 * Skips gracefully if source assets or native folder are missing.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { activeProfile } from "./_profileUtils";

const p = activeProfile();

function safeCopy(src: string, dest: string, label: string) {
  if (!existsSync(src)) {
    console.log(`[assets] Skip ${label}: ${src} missing`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[assets] Copied ${label}: ${src} → ${dest}`);
}

// iOS asset catalogue (icons + splash go through @capacitor/assets in a later pass)
const iosAssets = join(p.iosDir, "App", "App", "Assets.xcassets");
safeCopy(p.iconPath, join(p.resourcesDir, ".icon-source.png"), "icon source");
safeCopy(p.splashPath, join(p.resourcesDir, ".splash-source.png"), "splash source");
if (existsSync(iosAssets)) {
  console.log(
    `[assets] iOS Assets.xcassets found — run "npx @capacitor/assets generate --assetPath ${p.resourcesDir}" separately to populate icons/splash.`
  );
}

// Android Firebase config
if (p.push.fcmConfigPath) {
  const androidApp = join(p.androidDir, "app");
  if (existsSync(androidApp)) {
    safeCopy(p.push.fcmConfigPath, join(androidApp, "google-services.json"), "FCM config");
  }
}

console.log(`✓ sync-assets done for profile "${p.id}"`);
