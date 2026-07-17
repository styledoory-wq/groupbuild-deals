/**
 * Generates the iOS Splash.imageset (1x/2x/3x + Contents.json) for the
 * active profile from resources/<profile>/splash.png. Runs as part of
 * `app:sync` so nobody needs @capacitor/assets or manual Xcode work.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { activeProfile } from "./_profileUtils";

const FILES = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"];

async function main() {
  const p = activeProfile();
  if (!existsSync(p.splashPath)) {
    console.log(`[splash] Skip — source splash missing: ${p.splashPath}`);
    return;
  }
  const imageset = join(p.iosDir, "App", "App", "Assets.xcassets", "Splash.imageset");
  if (!existsSync(join(p.iosDir, "App", "App", "Assets.xcassets"))) {
    console.log(`[splash] Skip — iOS Assets.xcassets missing (run cap add ios first)`);
    return;
  }
  mkdirSync(imageset, { recursive: true });

  const buf = await sharp(p.splashPath)
    .resize(2732, 2732, { fit: "cover" })
    .removeAlpha()
    .flatten({ background: p.splashBackgroundColor })
    .png({ compressionLevel: 9 })
    .toBuffer();

  for (const filename of FILES) {
    writeFileSync(join(imageset, filename), buf);
  }

  const contents = {
    images: [
      { idiom: "universal", filename: "splash-2732x2732.png", scale: "1x" },
      { idiom: "universal", filename: "splash-2732x2732-1.png", scale: "2x" },
      { idiom: "universal", filename: "splash-2732x2732-2.png", scale: "3x" },
    ],
    info: { author: "xcode", version: 1 },
  };
  writeFileSync(join(imageset, "Contents.json"), JSON.stringify(contents, null, 2) + "\n");

  console.log(`[splash] Generated Splash.imageset for profile "${p.id}"`);
}

main().catch((err) => {
  console.error("[splash] Failed:", err);
  process.exit(1);
});
