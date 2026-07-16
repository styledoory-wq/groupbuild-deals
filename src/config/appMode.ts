// Build-time app mode.
// - "residents" → iOS/Android build for residents (GroupBuild)
// - "suppliers" → iOS/Android build for suppliers (GroupBuild לעסקים)
// - "web"       → full web build (default): residents + suppliers + admin
//
// Set via VITE_APP_MODE at build time. Defaults to "web" so the existing
// Lovable preview and public website continue to work exactly as before.

export type AppMode = "residents" | "suppliers" | "web";

const raw = (import.meta.env.VITE_APP_MODE as string | undefined)?.toLowerCase();

export const APP_MODE: AppMode =
  raw === "residents" || raw === "suppliers" ? raw : "web";

export const IS_RESIDENTS_BUILD = APP_MODE === "residents";
export const IS_SUPPLIERS_BUILD = APP_MODE === "suppliers";
export const IS_WEB_BUILD = APP_MODE === "web";

/** Should this build expose resident-only screens? */
export const includesResidentRoutes = IS_RESIDENTS_BUILD || IS_WEB_BUILD;
/** Should this build expose supplier-only screens? */
export const includesSupplierRoutes = IS_SUPPLIERS_BUILD || IS_WEB_BUILD;
/** Should this build expose admin screens? Web-only. */
export const includesAdminRoutes = IS_WEB_BUILD;
