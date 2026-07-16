/**
 * Generates PrivacyInfo.xcprivacy for the active profile ONLY.
 * Runs as part of `build-app.ts`. Safe if the iOS folder doesn't exist yet.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { activeProfile } from "./_profileUtils";

const p = activeProfile();
const iosAppDir = join(p.iosDir, "App", "App");
if (!existsSync(iosAppDir)) {
  console.log(`[privacy] Skipping — ${iosAppDir} not created yet. Run cap add ios first.`);
  process.exit(0);
}

const manifest = {
  NSPrivacyTracking: p.privacyManifest.trackingEnabled,
  NSPrivacyCollectedDataTypes: p.privacyManifest.collectedDataTypes.map((t) => ({
    NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${t}`,
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [
      "NSPrivacyCollectedDataTypePurposeAppFunctionality",
    ],
  })),
  NSPrivacyAccessedAPITypes: p.privacyManifest.accessedAPITypes.map((a) => ({
    NSPrivacyAccessedAPIType: `NSPrivacyAccessedAPICategory${a.type}`,
    NSPrivacyAccessedAPITypeReasons: a.reasons,
  })),
};

mkdirSync(iosAppDir, { recursive: true });
writeFileSync(
  join(iosAppDir, "PrivacyInfo.xcprivacy"),
  JSON.stringify(manifest, null, 2)
);
console.log(`✓ Wrote PrivacyInfo.xcprivacy for profile "${p.id}"`);
