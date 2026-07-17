/**
 * Generates a complete, valid iOS AppIcon.appiconset for the active profile
 * from resources/<profile>/icon.png. Also writes a matching Contents.json.
 *
 * Runs as part of `app:sync` so users never need @capacitor/assets or manual
 * Xcode work. Icon PNGs are flattened to opaque RGB (Apple rejects alpha).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { activeProfile } from "./_profileUtils";

type IconSpec = {
  filename: string;
  size: number; // pixels (final)
  idiom: "iphone" | "ipad" | "ios-marketing";
  sizePt: string; // e.g. "60x60"
  scale: "1x" | "2x" | "3x";
};

const SPECS: IconSpec[] = [
  { filename: "AppIcon-20@2x.png",   size: 40,   idiom: "iphone",        sizePt: "20x20",     scale: "2x" },
  { filename: "AppIcon-20@3x.png",   size: 60,   idiom: "iphone",        sizePt: "20x20",     scale: "3x" },
  { filename: "AppIcon-29@2x.png",   size: 58,   idiom: "iphone",        sizePt: "29x29",     scale: "2x" },
  { filename: "AppIcon-29@3x.png",   size: 87,   idiom: "iphone",        sizePt: "29x29",     scale: "3x" },
  { filename: "AppIcon-40@2x.png",   size: 80,   idiom: "iphone",        sizePt: "40x40",     scale: "2x" },
  { filename: "AppIcon-40@3x.png",   size: 120,  idiom: "iphone",        sizePt: "40x40",     scale: "3x" },
  { filename: "AppIcon-60@2x.png",   size: 120,  idiom: "iphone",        sizePt: "60x60",     scale: "2x" },
  { filename: "AppIcon-60@3x.png",   size: 180,  idiom: "iphone",        sizePt: "60x60",     scale: "3x" },
  { filename: "AppIcon-ipad-20@1x.png", size: 20,  idiom: "ipad",        sizePt: "20x20",     scale: "1x" },
  { filename: "AppIcon-ipad-20@2x.png", size: 40,  idiom: "ipad",        sizePt: "20x20",     scale: "2x" },
  { filename: "AppIcon-ipad-29@1x.png", size: 29,  idiom: "ipad",        sizePt: "29x29",     scale: "1x" },
  { filename: "AppIcon-ipad-29@2x.png", size: 58,  idiom: "ipad",        sizePt: "29x29",     scale: "2x" },
  { filename: "AppIcon-ipad-40@1x.png", size: 40,  idiom: "ipad",        sizePt: "40x40",     scale: "1x" },
  { filename: "AppIcon-ipad-40@2x.png", size: 80,  idiom: "ipad",        sizePt: "40x40",     scale: "2x" },
  { filename: "AppIcon-76@1x.png",   size: 76,   idiom: "ipad",          sizePt: "76x76",     scale: "1x" },
  { filename: "AppIcon-76@2x.png",   size: 152,  idiom: "ipad",          sizePt: "76x76",     scale: "2x" },
  { filename: "AppIcon-83.5@2x.png", size: 167,  idiom: "ipad",          sizePt: "83.5x83.5", scale: "2x" },
  { filename: "AppIcon-1024.png",    size: 1024, idiom: "ios-marketing", sizePt: "1024x1024", scale: "1x" },
];

async function main() {
  const p = activeProfile();
  if (!existsSync(p.iconPath)) {
    console.log(`[icons] Skip — source icon missing: ${p.iconPath}`);
    return;
  }
  const iosAssets = join(p.iosDir, "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  if (!existsSync(join(p.iosDir, "App", "App", "Assets.xcassets"))) {
    console.log(`[icons] Skip — iOS Assets.xcassets missing (run cap add ios first)`);
    return;
  }
  mkdirSync(iosAssets, { recursive: true });

  const src = await sharp(p.iconPath).removeAlpha().toBuffer();
  for (const spec of SPECS) {
    const outPath = join(iosAssets, spec.filename);
    await sharp(src)
      .resize(spec.size, spec.size, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }

  const contents = {
    images: SPECS.map((s) => ({
      size: s.sizePt,
      idiom: s.idiom,
      filename: s.filename,
      scale: s.scale,
    })),
    info: { author: "xcode", version: 1 },
  };
  writeFileSync(join(iosAssets, "Contents.json"), JSON.stringify(contents, null, 2) + "\n");

  console.log(`[icons] Generated ${SPECS.length} iOS icons for profile "${p.id}"`);
}

main().catch((err) => {
  console.error("[icons] Failed:", err);
  process.exit(1);
});
