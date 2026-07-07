import { TermsContent } from "@/components/terms/TermsContent";
import { Seo } from "@/components/seo/Seo";

export default function TermsSuppliers() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 flex justify-center">
      <Seo title={"תנאי שימוש לספקים | GroupBuild"} description={"תנאי השימוש בפלטפורמת GroupBuild עבור ספקים המפרסמים הצעות ולידים."} path="/terms/suppliers" />
      <div className="w-full max-w-2xl bg-white rounded-[20px] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)] p-6 md:p-8">
        <TermsContent audience="supplier" />
      </div>
    </div>
  );
}
