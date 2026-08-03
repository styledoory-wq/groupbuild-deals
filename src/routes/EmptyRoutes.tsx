/**
 * Build-time stub for route groups that are excluded from a given app profile.
 *
 * `vite.config.ts` aliases `@/routes/AdminRoutes`, `@/routes/ResidentRoutes` or
 * `@/routes/SupplierRoutes` to this file depending on `VITE_APP_MODE`, so the
 * excluded screens are never pulled into the module graph — they cannot be
 * shipped inside the iOS bundles even as lazy chunks.
 */
export const publicRoutes = null;
export const residentRoutes = null;
export const supplierRoutes = null;
export const adminRoutes = null;
