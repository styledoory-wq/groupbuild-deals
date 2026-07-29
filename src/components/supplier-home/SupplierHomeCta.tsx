import { Link } from "react-router-dom";
import { MotionHover } from "@/components/motion/MotionHover";
import { Reveal } from "@/components/resident-home/Reveal";

function setSupplierIntent() {
  try {
    sessionStorage.setItem("gb_intent", "supplier");
  } catch {
    /* ignore */
  }
}

export function SupplierHomeCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="px-6 mt-9 mb-8">
      <Reveal>
        <div
          className="rounded-[28px] p-5 text-center text-white shadow-[0_18px_40px_-18px_rgba(14,107,90,0.55)]"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(135deg, #0E6B5A 0%, #1A8870 55%, #0A5446 100%)",
          }}
        >
          <h2 className="text-[22px] font-extrabold tracking-tight">
            מוכנים לקבל לידים?
          </h2>
          <p className="mt-2 text-[14px] text-white/90 leading-relaxed max-w-[28ch] mx-auto">
            {signedIn
              ? "עברו למרחב הספק — פרסמו הצעה והתחילו לקבל פניות."
              : "ההרשמה חינם. תוך דקות בונים פרופיל ומתחילים לקבל פניות."}
          </p>
          <div className="mt-5 space-y-2.5">
            <MotionHover className="w-full">
              <Link
                to={signedIn ? "/supplier" : "/auth/supplier?mode=signup"}
                onClick={signedIn ? undefined : setSupplierIntent}
                className="flex h-[52px] items-center justify-center rounded-2xl bg-white text-[#0E6B5A] font-extrabold text-[15px] shadow-[0_8px_20px_-12px_rgba(0,0,0,0.35)]"
              >
                {signedIn ? "לאזור הספק" : "הצטרף כספק"}
              </Link>
            </MotionHover>
            {!signedIn && (
              <MotionHover className="w-full">
                <Link
                  to="/auth/supplier?mode=signin"
                  onClick={setSupplierIntent}
                  className="flex h-12 items-center justify-center rounded-2xl border border-white/35 text-white font-bold text-[14px]"
                >
                  כבר רשום? התחבר
                </Link>
              </MotionHover>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#8B93A1]">
          רשת ספקים מאומתת · לידים מפרויקטים אמיתיים
        </p>
      </Reveal>
    </section>
  );
}
