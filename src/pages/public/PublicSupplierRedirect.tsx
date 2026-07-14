/**
 * /supplier/:slug — public SEO-friendly URL.
 * Reuses the existing SupplierProfile page, which now accepts either
 * `:supplierId` or `:slug` from the route params.
 */
import SupplierProfile from "@/pages/SupplierProfile";
export default function PublicSupplierRedirect() {
  return <SupplierProfile />;
}
