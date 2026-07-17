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
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { activeProfile } from "./_profileUtils";

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

// 1. Clean old web build output — never trust/ship a stale dist for this profile.
cleanDir(p.webDir, "old web build");

// 2. Full, fresh web build for this profile ONLY.
//    --mode <profile.id> makes Vite load .env.<id> (VITE_APP_MODE, VITE_APP_PROFILE_ID)
//    at build time, so IS_RESIDENTS_BUILD/IS_SUPPLIERS_BUILD are baked into the bundle —
//    not just applied later during `cap sync`.
run("npx", ["vite", "build", "--mode", p.id, "--outDir", p.webDir]);

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
}

// 5. Regenerate native assets (icons/splash sources, AppIcon.appiconset,
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
