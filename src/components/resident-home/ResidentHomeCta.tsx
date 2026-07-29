import { Link } from "react-router-dom";
import { MotionHover } from "@/components/motion/MotionHover";
import { Reveal } from "./Reveal";

function setResidentIntent() {
  try {
    sessionStorage.setItem("gb_intent", "resident");
  } catch {
    /* ignore */
  }
}

export function ResidentHomeCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="px-6 mt-9">
      <Reveal>
        <div
          className="rounded-[28px] p-5 text-center text-white shadow-[0_18px_40px_-18px_rgba(14,107,90,0.55)]"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(135deg, #0E6B5A 0%, #1A8870 55%, #0A5446 100%)",
          }}
        >
          <h2 className="text-[22px] font-extrabold tracking-tight">
            מוכנים להתחיל לחסוך?
          </h2>
          <p className="mt-2 text-[14px] text-white/90 leading-relaxed max-w-[28ch] mx-auto">
            {signedIn
              ? "עברו לאזור האישי או מצאו את הקבוצה של הפרויקט שלכם."
              : "הירשמו כדייר או מצאו את הקבוצה של הפרויקט שלכם."}
          </p>
          <div className="mt-5 space-y-2.5">
            <MotionHover className="w-full">
              <Link
                to={signedIn ? "/resident" : "/auth/resident?mode=signup"}
                onClick={signedIn ? undefined : setResidentIntent}
                className="flex h-[52px] items-center justify-center rounded-2xl bg-white text-[#0E6B5A] font-extrabold text-[15px] shadow-[0_8px_20px_-12px_rgba(0,0,0,0.35)]"
              >
                {signedIn ? "לאזור האישי" : "הירשם / התחבר כדייר"}
              </Link>
            </MotionHover>
            <MotionHover className="w-full">
              <Link
                to={signedIn ? "/resident/projects" : "/auth/resident?mode=signin"}
                onClick={signedIn ? undefined : setResidentIntent}
                className="flex h-12 items-center justify-center rounded-2xl border border-white/35 text-white font-bold text-[14px]"
              >
                מצא את הקבוצה שלך
              </Link>
            </MotionHover>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#8B93A1]">
          אפשר גם לחפש ספק מיד למעלה — בלי הרשמה
        </p>
      </Reveal>
    </section>
  );
}
