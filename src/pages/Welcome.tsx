import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/auth";

/**
 * Welcome — minimal Blink-style entry screen.
 * Big logo, tagline, primary auth CTAs, plus a secondary
 * "פרטים על האפליקציה" button that opens the full marketing page (/about).
 */
export default function Welcome() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userType, setUserType] = useState<"resident" | "supplier">("resident");

  useEffect(() => {
    let cancelled = false;
    const load = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (cancelled) return;
      if (!session) {
        setIsAuthed(false);
        setUserEmail("");
        return;
      }
      setIsAuthed(true);
      setUserEmail(session.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setUserType((profile?.user_type as "resident" | "supplier") ?? "resident");
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const goDashboard = () => {
    if (isAdminEmail(userEmail)) { navigate("/admin"); return; }
    navigate(userType === "supplier" ? "/supplier" : "/resident");
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] flex justify-center text-white relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0A1F3D 0%, #0D2748 55%, #07172E 100%)" }}
    >
      {/* Ambient gold orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#C9A961]/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-96 w-96 rounded-full bg-[#C9A961]/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#0A1F3D]/40 blur-3xl" />
      </div>

      <div
        className="relative z-10 w-full max-w-screen-sm flex flex-col px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        {/* Hero — centered logo & tagline */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 -m-8 rounded-full bg-[#C9A961]/15 blur-2xl" aria-hidden />
            <div className="relative h-28 w-28 rounded-[28px] bg-white/8 border border-white/15 backdrop-blur-md flex items-center justify-center shadow-[0_20px_60px_-20px_rgba(201,169,97,0.5)]">
              <BrandLogo variant="light" size="lg" />
            </div>
          </div>

          <div className="space-y-3 animate-fade-up">
            <h1 className="text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] font-extrabold tracking-tight">
              ברוכים הבאים
              <br />
              ל־<span className="bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#E8C97D] bg-clip-text text-transparent">GroupBuild</span>
            </h1>
            <div className="mx-auto h-[2px] w-16 rounded-full bg-gradient-to-l from-transparent via-[#C9A961] to-transparent" />
            <p className="text-white/70 text-base leading-relaxed max-w-xs mx-auto">
              קונים יחד. משלמים פחות.
              <br />
              הצטרפו לכוח הקנייה של השכונה שלכם.
            </p>
          </div>
        </div>

        {/* Action stack */}
        <div className="space-y-3 pb-2 animate-fade-up">
          {isAuthed ? (
            <Button
              onClick={goDashboard}
              className="w-full h-14 rounded-2xl bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#E8C97D] text-[#0A1F3D] font-bold text-base shadow-[0_12px_40px_-12px_rgba(201,169,97,0.7)] hover:brightness-105"
            >
              המשך לדשבורד שלך
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate("/auth?mode=signup")}
                className="w-full h-14 rounded-2xl bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#E8C97D] text-[#0A1F3D] font-bold text-base shadow-[0_12px_40px_-12px_rgba(201,169,97,0.7)] hover:brightness-105"
              >
                <UserPlus className="h-4 w-4" />
                הרשמה
              </Button>
              <Button
                onClick={() => navigate("/auth?mode=signin")}
                className="w-full h-14 rounded-2xl bg-white/8 hover:bg-white/14 border border-white/20 backdrop-blur text-white font-semibold text-base"
              >
                <LogIn className="h-4 w-4" />
                התחברות
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate("/about")}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white/70 hover:text-[#C9A961] text-sm font-medium transition-colors"
          >
            <Info className="h-4 w-4" />
            פרטים על האפליקציה
          </button>
        </div>

        <p className="text-center text-[11px] text-white/40 mt-4">
          © GroupBuild · מרוויחים יחד על הבית
        </p>
      </div>
    </div>
  );
}
