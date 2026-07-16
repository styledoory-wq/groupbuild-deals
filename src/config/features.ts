/**
 * Feature flags for the active build profile.
 * On web (no VITE_APP_PROFILE_ID), all features are enabled by default.
 */
import { APP_PROFILES, type AppProfileFeatures } from "../../app-profiles.config";

const profileId = (import.meta.env.VITE_APP_PROFILE_ID as string | undefined)?.toLowerCase();
const activeProfile = profileId
  ? APP_PROFILES.find((p) => p.id === profileId)
  : undefined;

export const FEATURES: AppProfileFeatures = activeProfile?.features ?? {};

/** Returns true unless the feature is explicitly disabled (false) for this profile. */
export function isFeatureEnabled(key: keyof AppProfileFeatures | string): boolean {
  const v = FEATURES[key as string];
  return v !== false;
}
