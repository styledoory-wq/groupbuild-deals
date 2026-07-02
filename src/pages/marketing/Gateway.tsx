import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Briefcase } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { isAdminEmail } from "@/lib/auth";
import { BrandMark } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * Public entry gateway at "/".
 * - Anonymous visitors: choose "אני דייר" or "אני ספק".
 * - Logged-in users: auto-redirect to their dashboard (same rules as before).
 */
export default function Gateway() {
  const navigate = useNavigate();
  const { user, authReady, needsOnboarding } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    if (isAdminEmail(user.email)) { navigate("/admin", { replace: true }); return; }
    if (needsOnboarding) { navigate("/onboarding", { replace: true }); return; }
    navigate(user.role === "supplier" ? "/supplier" : "/resident", { replace: true });
  }, [authReady, user, needsOnboarding, navigate]);

  // While auth state resolves for a possibly-signed-in user, avoid a flash of the gateway.
  if (!authReady || user) {
    return <div style={{ minHeight: "100dvh", background: "#F7F5F0" }} aria-hidden />;
  }

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex justify-center text-[#0B1220] relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #F7F5F0 0%, #EFEAE0 100%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-[0.24]"
          style={{ background: "radial-gradient(circle, #34A88E 0%, transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-24 h-[460px] w-[460px] rounded-full blur-3xl opacity-[0.20]"
          style={{ background: "radial-gradient(circle, #0E6B5A 0%, transparent 65%)" }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-screen-sm flex flex-col px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 40px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        <div className="pt-4 pb-2 flex flex-col items-center text-center animate-fade-up">
          <BrandMark className="h-24 w-auto" />
          <h1 className="mt-6 text-[clamp(1.75rem,6vw,2.25rem)] font-extrabold leading-tight tracking-tight text-[#0B1220]">
            ברוכים הבאים ל־GroupBuild
          </h1>
          <div className="mt-3 h-[2px] w-10 rounded-full bg-[#0E6B5A]" />
          <p className="mt-3 text-[#5B6472] text-[14px] font-medium leading-relaxed max-w-[24rem]">
            כוח קנייה קבוצתי שמחבר בין דיירים לספקים איכותיים — וחוסך לכולם.
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center py-10 gap-4 animate-fade-up">
          <GatewayCard
            to="/residents"
            title="אני דייר / ועד בית"
            desc="הצטרפו לעסקאות קבוצתיות, חסכו בשיפוץ ובבנייה ונהלו ועד בית פשוט וחכם."
            icon={Building2}
            accent="#0E6B5A"
          />
          <GatewayCard
            to="/suppliers"
            title="אני ספק"
            desc="קבלו לידים איכותיים, גישה לפרויקטים חדשים ורשת ספקים פרימיום."
            icon={Briefcase}
            accent="#0A5446"
            variant="dark"
          />
        </div>

        <div className="text-center pb-4">
          <Link
            to="/auth"
            className="text-sm text-[#4B5563] hover:text-[#0E6B5A] font-semibold transition-colors underline-offset-4 hover:underline"
          >
            כבר יש לי חשבון — כניסה
          </Link>
        </div>
      </div>
    </div>
  );
}

function GatewayCard({
  to,
  title,
  desc,
  icon: Icon,
  accent,
  variant = "light",
}: {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  return (
    <Link
      to={to}
      className={cn(
        "group relative block rounded-[22px] p-5 transition-all active:scale-[0.98]",
        "shadow-[0_10px_30px_-14px_rgba(10,31,61,0.28)] hover:shadow-[0_16px_40px_-14px_rgba(10,31,61,0.32)]",
        isDark ? "text-white" : "text-[#0B1220] bg-white",
      )}
      style={isDark ? { background: `linear-gradient(135deg, ${accent} 0%, #0E6B5A 100%)` } : undefined}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "h-14 w-14 rounded-[16px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
            isDark ? "bg-white/15" : "bg-[#F0F5F3]",
          )}
          style={!isDark ? { color: accent } : undefined}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className={cn("text-[17px] font-extrabold leading-tight", isDark ? "text-white" : "text-[#0B1220]")}>
              {title}
            </h2>
            <ArrowLeft
              className={cn(
                "h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1",
                isDark ? "text-white/80" : "text-[#0E6B5A]",
              )}
            />
          </div>
          <p className={cn("mt-1.5 text-[13px] leading-relaxed", isDark ? "text-white/85" : "text-[#5B6472]")}>
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}
