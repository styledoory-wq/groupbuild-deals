import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/store/AppStore";
import { isAdminIdentifier, setAdminSession } from "@/lib/auth";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"identify" | "verify">("identify");

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminIdentifier(identifier)) {
      toast.error("פרטי הזיהוי אינם מורשים לגישת ניהול");
      return;
    }
    // Demo: accept any 4+ digit code. In production this is OTP / Supabase Auth.
    setStep("verify");
    toast.success("נשלח קוד אימות לאדמין (דמו: הקלידו 4 ספרות)");
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      toast.error("יש להזין קוד תקין");
      return;
    }
    setAdminSession(true);
    setUser({
      id: "u_admin",
      role: "admin",
      name: "מנהל מערכת",
      phone: identifier.includes("@") ? "" : identifier,
      email: identifier.includes("@") ? identifier : "",
    });
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from.startsWith("/admin") ? from : "/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col px-6 pt-16 pb-8">
        <button
          onClick={() => navigate("/")}
          className="self-start text-xs text-primary-foreground/60 hover:text-gold transition-smooth flex items-center gap-1 mb-8"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה
        </button>

        <div className="relative animate-fade-up">
          <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-6">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2">כניסת ניהול</h1>
            <div className="gb-divider-gold mb-4" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              גישה מאובטחת לפאנל ניהול GroupBuild. רק מזהים מורשים יכולים להיכנס.
            </p>
          </div>
        </div>

        <div className="mt-10 bg-background text-foreground rounded-3xl p-6 shadow-elevated animate-fade-up">
          {step === "identify" ? (
            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  טלפון או אימייל מנהל
                </label>
                <Input
                  type="text"
                  placeholder="הזן מזהה ניהול"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 rounded-2xl bg-card border-border text-base"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold text-base shadow-card"
              >
                <Lock className="h-4 w-4 ml-2" />
                המשך לאימות
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  קוד אימות
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-14 rounded-2xl bg-card border-border text-2xl text-center tracking-[0.5em] font-bold"
                  dir="ltr"
                  autoFocus
                  maxLength={6}
                />
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  במצב דמו — כל קוד בן 4 ספרות יתקבל
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold text-base shadow-gold"
              >
                כניסה לפאנל הניהול
              </Button>
              <button
                type="button"
                onClick={() => setStep("identify")}
                className="w-full text-xs text-muted-foreground hover:text-primary transition-smooth"
              >
                חזרה לזיהוי
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-primary-foreground/50 mt-6">
          הגישה מתועדת ומאובטחת
        </p>
      </div>
    </div>
  );
}
