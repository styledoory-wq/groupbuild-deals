/**
 * Generates apple-app-site-association from ALL profiles.
 * Deploy the output to https://<host>/.well-known/apple-app-site-association
 *
 * Requires APPLE_TEAM_ID env var (or apple.teamId in the profile).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { allProfiles } from "./_profileUtils";

const defaultTeamId = process.env.APPLE_TEAM_ID ?? "TEAMID";

const details = allProfiles().map((p) => {
  const teamId = p.apple.teamId ?? defaultTeamId;
  return {
    appIDs: [`${teamId}.${p.appId}`],
    components: p.universalLinks.paths.map((path) => ({ "/": path })),
  };
});

const aasa = {
  applinks: { details },
  webcredentials: { apps: details.flatMap((d) => d.appIDs) },
};

mkdirSync("public/.well-known", { recursive: true });
writeFileSync(
  "public/.well-known/apple-app-site-association",
  JSON.stringify(aasa, null, 2)
);
console.log("✓ Wrote public/.well-known/apple-app-site-association");
