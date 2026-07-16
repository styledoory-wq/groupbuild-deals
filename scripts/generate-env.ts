/**
 * Regenerates `.env.<id>` files from APP_PROFILES.
 * Idempotent — safe to re-run whenever the registry changes.
 */
import { writeFileSync } from "node:fs";
import { allProfiles } from "./_profileUtils";

for (const p of allProfiles()) {
  const body = [
    `VITE_APP_MODE=${p.appMode}`,
    `VITE_APP_PROFILE_ID=${p.id}`,
    "",
  ].join("\n");
  writeFileSync(`.env.${p.id}`, body);
  console.log(`✓ Wrote .env.${p.id}`);
}
