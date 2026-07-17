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

// 1. Build web bundle for this profile (env file selects VITE_APP_MODE).
run("npx", ["vite", "build", "--mode", p.id, "--outDir", p.webDir]);

// 2. Sync per-profile assets/manifest/entitlements into the native folder.
run("npx", ["tsx", "scripts/sync-assets.ts"]);
run("npx", ["tsx", "scripts/generate-app-icons.ts"]);
run("npx", ["tsx", "scripts/generate-privacy-manifest.ts"]);
run("npx", ["tsx", "scripts/generate-info-plist-overrides.ts"]);

if (args.has("--add-ios")) {
  run("npx", ["cap", "add", "ios"]);
}
if (args.has("--add-android")) {
  run("npx", ["cap", "add", "android"]);
}
if (args.has("--sync") || args.has("--open")) {
  run("npx", ["cap", "sync"]);
}
if (args.has("--open")) {
  run("npx", ["cap", "open", "ios"]);
}

console.log(`\n✓ Done for profile "${p.id}" (${p.appId})`);
