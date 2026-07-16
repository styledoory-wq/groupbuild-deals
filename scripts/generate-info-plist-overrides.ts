/**
 * Placeholder for per-profile Info.plist overrides (CFBundleDisplayName,
 * CFBundleURLTypes for the custom scheme, associated-domains entitlements).
 *
 * Capacitor writes CFBundleDisplayName from `appName` on `cap sync`, so for
 * now this script only warns if fields are missing. Extended in a later step.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { activeProfile } from "./_profileUtils";

const p = activeProfile();
const infoPlist = join(p.iosDir, "App", "App", "Info.plist");
if (!existsSync(infoPlist)) {
  console.log(`[info-plist] Skipping — ${infoPlist} not created yet.`);
  process.exit(0);
}
console.log(
  `[info-plist] Profile "${p.id}" — CFBundleDisplayName="${p.appName}", scheme="${p.scheme ?? "(none)"}"`
);
console.log(
  `[info-plist] Configure Associated Domains in Xcode: applinks:${p.universalLinks.host}`
);
