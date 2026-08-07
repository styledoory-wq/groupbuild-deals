import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { TermsContent } from "@/components/terms/TermsContent";
import { Seo } from "@/components/seo/Seo";

export default function TermsResidents() {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };
  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 flex justify-center">
      <Seo title={"תנאי שימוש לדיירים | GroupBuild"} description={"תנאי השימוש בפלטפורמת GroupBuild עבור דיירים ומצטרפי רכישות קבוצתיות."} path="/terms/residents" />
      <div dir="rtl" className="w-full max-w-2xl bg-white rounded-[20px] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)] p-6 md:p-8">
        <button
          type="button"
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-1 h-10 -mr-2 px-2 rounded-full text-[14px] font-bold text-[#0E6B5A] hover:bg-[#0E6B5A]/5 transition-colors"
        >
          <ChevronRight className="h-[18px] w-[18px]" />
          חזרה
        </button>
        <TermsContent audience="resident" />
      </div>
    </div>
  );
}
