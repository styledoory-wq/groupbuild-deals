import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, ArrowRight, Home } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useSmartBack, profileHomePath } from "@/lib/backNavigation";
import { IS_SUPPLIERS_BUILD } from "@/config/appMode";

/**
 * Branded Hebrew/RTL 404. Never exposes the attempted path or any internal
 * route information to the user — the raw path is only logged to the console.
 */
const NotFound = () => {
  const location = useLocation();
  const smartBack = useSmartBack(profileHomePath());

  useEffect(() => {
    console.warn("404: route not found", location.pathname);
  }, [location.pathname]);

  const homePath = profileHomePath();
  const homeLabel = IS_SUPPLIERS_BUILD ? "לאזור העסקי" : "לדף הבית";

  return (
    <div
      dir="rtl"
      className="min-h-dvh flex items-center justify-center px-6"
      style={{ background: "#F7F5F0", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Seo
        title="העמוד לא נמצא | GroupBuild"
        description="העמוד שחיפשתם אינו קיים או הוסר. חזרו לדף הבית של GroupBuild."
        path="/404"
        noindex
      />
      <main className="w-full max-w-[var(--app-max-w)] text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-white grid place-items-center shadow-[0_10px_30px_-14px_rgba(10,31,61,0.28)]">
          <Compass className="h-9 w-9 text-[#0E6B5A]" strokeWidth={1.9} />
        </div>

        <h1 className="mt-6 text-[22px] font-extrabold text-[#1F2937] tracking-tight">
          לא מצאנו את העמוד הזה
        </h1>
        <p className="mt-2 text-[14px] text-[#6B7280] leading-relaxed max-w-[320px] mx-auto">
          ייתכן שהקישור ישן, שהעמוד הוסר, או שהכתובת הוקלדה בטעות.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            to={homePath}
            className="h-12 rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Home className="h-[18px] w-[18px]" /> {homeLabel}
          </Link>
          <button
            type="button"
            onClick={smartBack}
            className="h-12 rounded-2xl bg-white border border-[#E5E7EB] text-[#1F2937] text-[15px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <ArrowRight className="h-[18px] w-[18px]" /> חזרה
          </button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
