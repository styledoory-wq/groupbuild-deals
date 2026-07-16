/**
 * Per-profile Info.plist + entitlements writer.
 * Runs during `app:sync`. Only touches the ACTIVE profile's `iosDir`.
 *
 * - Sets CFBundleDisplayName, CFBundleShortVersionString, CFBundleVersion.
 * - Writes only the usage-description keys declared in the profile
 *   (no permission prompt is added if the profile doesn't need it).
 * - Adds CFBundleURLTypes for the custom scheme (deep links).
 * - Writes App.entitlements with Associated Domains + APS environment.
 *
 * Skips gracefully if the native folder hasn't been added yet
 * (`APP_PROFILE=<id> npm run app:add-ios`).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { activeProfile } from "./_profileUtils";

const p = activeProfile();
const infoPlistPath = join(p.iosDir, "App", "App", "Info.plist");

if (!existsSync(infoPlistPath)) {
  console.log(`[info-plist] Skipping — ${infoPlistPath} not created yet. Run APP_PROFILE=${p.id} npm run app:add-ios first.`);
  process.exit(0);
}

// --- Info.plist ------------------------------------------------------------
let plist = readFileSync(infoPlistPath, "utf8");

function upsertString(key: string, value: string) {
  const re = new RegExp(`(<key>${key}</key>\\s*)<string>[^<]*</string>`);
  if (re.test(plist)) {
    plist = plist.replace(re, `$1<string>${value}</string>`);
  } else {
    plist = plist.replace(
      /<dict>/,
      `<dict>\n\t<key>${key}</key>\n\t<string>${value}</string>`
    );
  }
}

function removeKey(key: string) {
  const re = new RegExp(`\\s*<key>${key}</key>\\s*<string>[^<]*</string>`, "g");
  plist = plist.replace(re, "");
}

// Identity + versioning
upsertString("CFBundleDisplayName", p.appName);
upsertString("CFBundleShortVersionString", p.version);
upsertString("CFBundleVersion", p.buildNumber);

// Usage descriptions — write only what's declared; strip the rest.
const usageMap: Record<keyof NonNullable<typeof p.iosUsageDescriptions>, string> = {
  camera: "NSCameraUsageDescription",
  photoLibrary: "NSPhotoLibraryUsageDescription",
  photoLibraryAdd: "NSPhotoLibraryAddUsageDescription",
  location: "NSLocationWhenInUseUsageDescription",
  microphone: "NSMicrophoneUsageDescription",
  faceID: "NSFaceIDUsageDescription",
};
for (const [field, plistKey] of Object.entries(usageMap) as Array<[keyof typeof usageMap, string]>) {
  const desc = p.iosUsageDescriptions?.[field];
  if (desc) upsertString(plistKey, desc);
  else removeKey(plistKey);
}

// CFBundleURLTypes for custom scheme (deep links: <scheme>://…)
if (p.scheme) {
  const urlBlock = `\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>${p.appId}</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${p.scheme}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n`;
  plist = plist.replace(/\s*<key>CFBundleURLTypes<\/key>[\s\S]*?<\/array>\s*<\/dict>\s*<\/array>/, "");
  plist = plist.replace(/<\/dict>\s*<\/plist>\s*$/, `${urlBlock}</dict>\n</plist>\n`);
}

writeFileSync(infoPlistPath, plist);
console.log(`[info-plist] Wrote ${infoPlistPath}`);
console.log(`  · CFBundleDisplayName = ${p.appName}`);
console.log(`  · Version ${p.version} (build ${p.buildNumber})`);
console.log(`  · Scheme: ${p.scheme ?? "(none)"}`);

// --- App.entitlements ------------------------------------------------------
// NOTE: We deliberately do NOT write `aps-environment` here. Xcode's
// "Push Notifications" capability toggle sets it automatically to match the
// active provisioning profile (development for Debug, production for
// Distribution). Hardcoding it here would conflict with Xcode's management
// and can cause signing errors like
// "Provisioning profile ... doesn't include the aps-environment entitlement".
// The user enables Push Notifications once in Signing & Capabilities per app.
const entitlementsPath = p.apple.entitlementsPath;
mkdirSync(dirname(entitlementsPath), { recursive: true });

const applinks = p.universalLinks?.host
  ? `\t<key>com.apple.developer.associated-domains</key>\n\t<array>\n\t\t<string>applinks:${p.universalLinks.host}</string>\n\t</array>\n`
  : "";

const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${applinks}</dict>
</plist>
`;
writeFileSync(entitlementsPath, entitlements);
console.log(`[entitlements] Wrote ${entitlementsPath}`);
console.log(`  · Associated Domains: applinks:${p.universalLinks.host}`);
console.log(`  · aps-environment: managed by Xcode Push Notifications capability`);

console.log(`\n✓ Info.plist + entitlements ready for profile "${p.id}"`);
