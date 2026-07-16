/**
 * Generates fastlane-compatible metadata folder per profile:
 *   fastlane/metadata/<profileId>/<lang>/{name,subtitle,description,keywords,...}.txt
 *
 * Consumed by CI to push App Store Connect listings without touching code.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { allProfiles } from "./_profileUtils";

for (const p of allProfiles()) {
  const langs = Object.keys(p.storeMetadata.description) as Array<"he" | "en">;
  for (const lang of langs) {
    const dir = join("fastlane", "metadata", p.id, lang === "he" ? "he" : "en-US");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "name.txt"), p.appName);
    if (p.shortName) writeFileSync(join(dir, "subtitle.txt"), p.shortName);
    writeFileSync(join(dir, "description.txt"), p.storeMetadata.description[lang] ?? "");
    writeFileSync(join(dir, "keywords.txt"), p.storeMetadata.keywords.join(","));
    writeFileSync(join(dir, "support_url.txt"), p.storeMetadata.supportUrl);
    writeFileSync(join(dir, "privacy_url.txt"), p.storeMetadata.privacyPolicyUrl);
    if (p.storeMetadata.marketingUrl)
      writeFileSync(join(dir, "marketing_url.txt"), p.storeMetadata.marketingUrl);
    if (p.storeMetadata.promotionalText?.[lang])
      writeFileSync(join(dir, "promotional_text.txt"), p.storeMetadata.promotionalText[lang]!);
    console.log(`✓ ${p.id}/${lang} metadata written`);
  }
}
