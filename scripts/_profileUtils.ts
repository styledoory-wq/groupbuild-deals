import { APP_PROFILES, requireProfile, type AppProfile } from "../app-profiles.config";

export function activeProfile(): AppProfile {
  const id = process.env.APP_PROFILE;
  if (!id) {
    throw new Error(
      `[profile] APP_PROFILE env var is required. Known: ${APP_PROFILES.map((x) => x.id).join(", ")}`
    );
  }
  return requireProfile(id);
}

export function allProfiles(): AppProfile[] {
  return APP_PROFILES;
}
