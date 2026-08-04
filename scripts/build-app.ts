/**
 * Unified build entrypoint. Reads APP_PROFILE from env and runs the requested
 * step for that profile ONLY. Never touches other profiles' folders.
 *
 * Usage:
 *   APP_PROFILE=residents tsx scripts/build-app.ts --sync
 *   APP_PROFILE=suppliers tsx scripts/build-app.ts --open
 *   APP_PROFILE=residents tsx scripts/build-app.ts --add-ios
 *   APP_PROFILE=residents tsx scripts/build-app.ts --add-android
 *   APP_PROFILE=residents tsx scripts/build-app.ts            # build only
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { activeProfile } from "./_profileUtils";
import type { AppProfile } from "../app-profiles.config";

const args = new Set(process.argv.slice(2));
const p = activeProfile();

function run(cmd: string, cmdArgs: string[], env: Record<string, string> = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}   [profile=${p.id}]`);
  const res = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    env: { ...process.env, APP_PROFILE: p.id, ...env },
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function cleanDir(dir: string, label: string) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`[clean] Removed ${label}: ${dir}`);
  } else {
    console.log(`[clean] ${label} already absent: ${dir}`);
  }
}

function assertNotLegacyPaths(profile: AppProfile) {
  if (profile.webDir === "dist") {
    throw new Error(`[build-app] Refusing webDir="dist" for profile "${profile.id}". Use dist-${profile.id}.`);
  }
  if (profile.iosDir === "ios") {
    throw new Error(`[build-app] Refusing iosDir="ios" for profile "${profile.id}". Use ios-${profile.id}.`);
  }
  if (profile.androidDir === "android") {
    throw new Error(`[build-app] Refusing androidDir="android" for profile "${profile.id}".`);
  }
}

function writeProfileMarker(webDir: string, profile: AppProfile) {
  const marker = {
    profileId: profile.id,
    appId: profile.appId,
    appMode: profile.appMode,
    webDir: profile.webDir,
    iosDir: profile.iosDir,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(join(webDir, ".app-profile.json"), JSON.stringify(marker, null, 2) + "\n");
  console.log(`[marker] Wrote ${webDir}/.app-profile.json`);
}

function verifyWebBuild(profile: AppProfile) {
  const indexHtml = join(profile.webDir, "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(`[verify] Web build missing index.html at ${indexHtml}`);
  }
  const html = readFileSync(indexHtml, "utf8");

  // heroPreloadPlugin embeds the profile-specific hero — proves --mode worked.
  if (profile.id === "residents") {
    if (!html.includes("resident-hero-bg")) {
      throw new Error(
        `[verify] ${profile.webDir}/index.html is not a residents build ` +
          `(missing resident-hero preload). Did VITE_APP_MODE bake correctly?`
      );
    }
    if (html.includes("supplier-hero-bg")) {
      throw new Error(`[verify] ${profile.webDir} looks like a web/suppliers build (has supplier-hero).`);
    }
  }
  if (profile.id === "suppliers") {
    if (!html.includes("supplier-hero-bg")) {
      throw new Error(`[verify] ${profile.webDir}/index.html is not a suppliers build.`);
    }
  }

  const markerPath = join(profile.webDir, ".app-profile.json");
  if (!existsSync(markerPath)) {
    throw new Error(`[verify] Missing profile marker ${markerPath}`);
  }
  const marker = JSON.parse(readFileSync(markerPath, "utf8")) as { profileId: string; appId: string };
  if (marker.profileId !== profile.id || marker.appId !== profile.appId) {
    throw new Error(`[verify] Marker mismatch: ${JSON.stringify(marker)} vs profile ${profile.id}`);
  }

  console.log(`[verify] Web build OK → ${profile.webDir} (profile=${profile.id})`);
}

function verifyIosSync(profile: AppProfile) {
  const publicDir = join(profile.iosDir, "App", "App", "public");
  const indexHtml = join(publicDir, "index.html");
  const capJsonPath = join(profile.iosDir, "App", "App", "capacitor.config.json");
  const markerPath = join(publicDir, ".app-profile.json");

  if (!existsSync(indexHtml)) {
    throw new Error(
      `[verify] iOS public/ was not populated at ${publicDir}.\n` +
        `  cap sync did not copy ${profile.webDir} → ${publicDir}.`
    );
  }
  if (!existsSync(capJsonPath)) {
    throw new Error(`[verify] Missing ${capJsonPath} after cap sync.`);
  }

  const cfg = JSON.parse(readFileSync(capJsonPath, "utf8")) as {
    appId?: string;
    webDir?: string;
    server?: { url?: string };
    ios?: { path?: string };
  };

  if (cfg.appId !== profile.appId) {
    throw new Error(`[verify] capacitor.config.json appId=${cfg.appId}, expected ${profile.appId}`);
  }
  if (cfg.webDir !== profile.webDir) {
    throw new Error(
      `[verify] capacitor.config.json webDir=${cfg.webDir}, expected ${profile.webDir} ` +
        `(must NOT be "dist").`
    );
  }
  if (cfg.server?.url) {
    throw new Error(`[verify] capacitor.config.json still has server.url=${cfg.server.url} — refuse live URL.`);
  }
  if (cfg.ios?.path && cfg.ios.path !== profile.iosDir) {
    throw new Error(`[verify] capacitor.config.json ios.path=${cfg.ios.path}, expected ${profile.iosDir}`);
  }
  if (cfg.ios?.path === "ios" || cfg.webDir === "dist") {
    throw new Error(`[verify] Legacy ios/ or dist/ path detected in synced capacitor.config.json`);
  }

  if (!existsSync(markerPath)) {
    throw new Error(`[verify] Profile marker not copied into iOS public/: ${markerPath}`);
  }
  const marker = JSON.parse(readFileSync(markerPath, "utf8")) as { profileId: string; appId: string };
  if (marker.profileId !== profile.id || marker.appId !== profile.appId) {
    throw new Error(`[verify] iOS public marker mismatch: ${JSON.stringify(marker)}`);
  }

  const html = readFileSync(indexHtml, "utf8");
  if (profile.id === "residents" && !html.includes("resident-hero-bg")) {
    throw new Error(`[verify] Synced iOS public/ is not the residents home build.`);
  }

  // Spot-check that JS assets landed (not an empty folder).
  const assetFiles = existsSync(join(publicDir, "assets"))
    ? readdirSync(join(publicDir, "assets")).filter((f) => f.endsWith(".js"))
    : [];
  if (assetFiles.length === 0) {
    throw new Error(`[verify] No JS assets under ${publicDir}/assets — sync copy failed.`);
  }

  const publicSize = dirSizeRough(publicDir);
  console.log(
    `[verify] iOS sync OK → ${publicDir}\n` +
      `         appId=${cfg.appId}  webDir=${cfg.webDir}  ios.path=${cfg.ios?.path ?? profile.iosDir}\n` +
      `         assets=${assetFiles.length} js files, ~${Math.round(publicSize / 1024)} KB`
  );
}

function dirSizeRough(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) total += dirSizeRough(full);
    else total += st.size;
  }
  return total;
}

function printXcodeCacheHint(profile: AppProfile) {
  console.log(`
────────────────────────────────────────────────────────────
Next (on your Mac):
  1. Clear stale Xcode cache if the old Landing still appears:
       rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
  2. Open ONLY this project (not a legacy ios/ folder):
       open ${profile.iosDir}/App/App.xcodeproj
  3. Confirm Target bundle id: ${profile.appId}
  4. Product → Clean Build Folder, then Run
  Home screen must be ResidentsHome (hero photo), not SiteLanding/Gateway.
────────────────────────────────────────────────────────────`);
}

assertNotLegacyPaths(p);

// Refuse to proceed if a leftover legacy ios/ folder exists — it causes
// developers to open the wrong Xcode project by mistake.
if (existsSync("ios")) {
  console.warn(
    `[warn] Legacy folder ./ios exists. Native apps live in ${p.iosDir}/. ` +
      `Remove ./ios to avoid opening the wrong project:  rm -rf ios`
  );
}

// 1. Clean old web build output — never trust/ship a stale dist for this profile.
cleanDir(p.webDir, "old web build");

// 2. Full, fresh web build for this profile ONLY.
//    --mode <profile.id> makes Vite load .env.<id> (VITE_APP_MODE, VITE_APP_PROFILE_ID)
//    at build time, so IS_RESIDENTS_BUILD/IS_SUPPLIERS_BUILD are baked into the bundle —
//    not just applied later during `cap sync`.
//    --outDir is also set in vite.config.ts from VITE_APP_MODE; CLI flag is belt-and-suspenders.
run("npx", ["vite", "build", "--mode", p.id, "--outDir", p.webDir]);
writeProfileMarker(p.webDir, p);
verifyWebBuild(p);

if (args.has("--add-ios")) {
  run("npx", ["cap", "add", "ios"]);
}
if (args.has("--add-android")) {
  run("npx", ["cap", "add", "android"]);
}

if (args.has("--sync") || args.has("--open")) {
  // 3. Clean the native project's embedded web copy so `cap sync` can never
  //    merge a fresh build on top of stale leftover files from a prior run.
  cleanDir(join(p.iosDir, "App", "App", "public"), "stale iOS public/ dir");

  // 4. Capacitor sync: copies the fresh webDir into the native project and
  //    resolves native plugin dependencies (SPM).
  run("npx", ["cap", "sync", "ios"]);

  // 5. Hard-fail if the copy did not actually land in ios-<profile>/App/App/public
  //    or if the synced config still points at legacy dist/ios.
  verifyIosSync(p);
}

// 6. Regenerate native assets (icons/splash sources, AppIcon.appiconset,
//    privacy manifest, Info.plist overrides) for this profile ONLY.
run("npx", ["tsx", "scripts/sync-assets.ts"]);
run("npx", ["tsx", "scripts/generate-app-icons.ts"]);
run("npx", ["tsx", "scripts/generate-splash.ts"]);
run("npx", ["tsx", "scripts/generate-privacy-manifest.ts"]);
run("npx", ["tsx", "scripts/generate-info-plist-overrides.ts"]);

if (args.has("--open")) {
  run("npx", ["cap", "open", "ios"]);
}

console.log(`\n✓ Done for profile "${p.id}" (${p.appId})`);
console.log(`  web:  ${p.webDir}/`);
console.log(`  ios:  ${p.iosDir}/App/App/public  ← bundled web assets`);
if (args.has("--sync") || args.has("--open")) {
  printXcodeCacheHint(p);
}
