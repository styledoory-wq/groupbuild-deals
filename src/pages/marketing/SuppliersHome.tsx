import { Seo } from "@/components/seo/Seo";
import { useApp } from "@/store/AppStore";
import { SupplierHomeHero } from "@/components/supplier-home/SupplierHomeHero";
import { SupplierWhatIsSection } from "@/components/supplier-home/SupplierWhatIsSection";
import { SupplierHowItWorksSection } from "@/components/supplier-home/SupplierHowItWorksSection";
import { SupplierBenefitsSection } from "@/components/supplier-home/SupplierBenefitsSection";
import { SupplierHomeCta } from "@/components/supplier-home/SupplierHomeCta";

/**
 * Suppliers opening experience — same visual language as ResidentsHome,
 * with supplier-specific value props and CTAs (no resident search).
 */
export default function SuppliersHome() {
  const { user } = useApp();
  const signedIn = !!user && user.role === "supplier";

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex justify-center text-[#0B1220] overflow-x-hidden"
      style={{ background: "#F7F5F0" }}
    >
      <Seo
        title="GroupBuild לספקים — לידים חמים מפרויקטים אמיתיים"
        description="הצטרפו לרשת הספקים של GroupBuild וקבלו פניות מדיירים וועדי בית שמתאגדים לקנייה קבוצתית."
        path="/suppliers"
      />

      <div
        className="relative w-full max-w-screen-sm flex flex-col"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 28px)" }}
      >
        <SupplierHomeHero signedIn={signedIn} />
        <SupplierWhatIsSection />
        <SupplierHowItWorksSection />
        <SupplierBenefitsSection />
        <SupplierHomeCta signedIn={signedIn} />
      </div>
    </div>
  );
}
