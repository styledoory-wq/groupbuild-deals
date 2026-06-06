import { useState, useLayoutEffect, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Briefcase, Mail, ArrowLeft, User as UserIcon, MapPin, Lock, Eye, EyeOff, HelpCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isAdminEmail, setAdminSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Role } from "@/types";
import { getFriendlyLoadError, withTimeout } from "@/lib/safeAsync";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import { resolveSupplierForUser } from "@/lib/supplierAuth";


type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, projects } = useApp();
  const [role, setRole] = useState<Exclude<Role, "admin">>("resident");
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);


  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);


  useLayoutEffect(() => {
    document.body.classList.add("auth-fullscreen");
    return () => document.body.classList.remove("auth-fullscreen");
  }, []);


  // If already logged in → redirect by role
  useEffect(() => {
    withTimeout(supabase.auth.getSession(), "בדיקת התחברות").then(async ({ data: { session } }) => {
      if (!session) return;
      await routeForUser(session.user.id, session.user.email ?? "");
    }).catch((error) => setAuthError(getFriendlyLoadError(error, "לא הצלחנו לבדוק את מצב ההתחברות.")));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Defer to avoid recursion
        setTimeout(() => {
          routeForUser(session.user.id, session.user.email ?? "")
            .catch((error) => setAuthError(getFriendlyLoadError(error, "לא הצלחנו לטעון את החשבון.")));
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeForUser = async (userId: string, userEmail: string) => {
    // Load profile + roles + supplier record in parallel.
    // user_roles is the source of truth for role; profile.user_type is fallback only.
    setAuthError(null);
    const [{ data: profile }, { data: roles }] = await Promise.all([
      withTimeout(supabase.from("profiles").select("*").eq("id", userId).maybeSingle(), "טעינת פרופיל"),
      withTimeout(supabase.from("user_roles").select("role").eq("user_id", userId), "טעינת הרשאות"),
    ]);
    const supplierRow = await withTimeout(resolveSupplierForUser(userId, userEmail, "id"), "טעינת ספק");

    // Admin access is granted ONLY by verified email match.
    const isAdmin = isAdminEmail(userEmail);

    // Determine role: prefer user_roles, then profile.user_type, then supplier-record presence.
    const roleNames = (roles ?? []).map((r) => r.role as string);
    let resolvedRole: Role = "resident";
    if (isAdmin) {
      resolvedRole = "admin";
    } else if (roleNames.includes("supplier")) {
      resolvedRole = "supplier";
    } else if (profile?.user_type === "supplier") {
      resolvedRole = "supplier";
    } else if (supplierRow?.id) {
      // Fallback: supplier record exists even though role wasn't set.
      resolvedRole = "supplier";
    } else if (profile?.user_type === "resident" || roleNames.includes("resident")) {
      resolvedRole = "resident";
    }

    setUser({
      id: userId,
      role: resolvedRole,
      name: profile?.full_name ?? profile?.business_name ?? userEmail,
      phone: profile?.phone ?? "",
      email: profile?.email ?? userEmail,
      projectId: profile?.project_id ?? undefined,
    });

    if (resolvedRole === "admin") {
      setAdminSession(true);
      navigate("/admin");
      return;
    }
    setAdminSession(false);
    if (resolvedRole === "supplier") navigate("/supplier");
    else navigate("/resident");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Redirect handled by onAuthStateChange
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("הזינו אימייל ואז לחצו 'שכחתי סיסמה'");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("שלחנו אליכם קישור לאיפוס סיסמה במייל");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת מייל איפוס נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (role === "resident" && !city.trim()) return;
    if (role === "supplier" && !businessName.trim()) return;
    if (!termsAccepted) {
      toast.error("יש לאשר את תנאי השימוש כדי להמשיך");
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            city,
            user_type: role,
            business_name: businessName,
            project_id: projectId || null,
          },
        },
      });
      if (error) throw error;
      // Persist terms acceptance on profile (best-effort, after trigger creates profile)
      const newUserId = data.user?.id;
      if (newUserId) {
        supabase.from("profiles").update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        }).eq("id", newUserId).then(() => { /* ignore */ });
      }
      // Notify admin about new signup (best effort)
      supabase.functions.invoke("notify-admin", {
        body: {
          event: role === "supplier" ? "new_supplier" : "new_resident",
          title: role === "supplier" ? "ספק חדש נרשם" : "דייר חדש נרשם",
          details: { full_name: fullName, email, phone: "", city, business_name: businessName, role },
        },
      }).catch(() => { /* ignore */ });
      toast.success("נרשמתם בהצלחה! מתחברים…");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "הרשמה נכשלה";
      if (msg.includes("already registered")) toast.error("המייל הזה כבר רשום");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  const roles: { id: Exclude<Role, "admin">; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "resident", label: "דייר", icon: Building2, desc: "הצטרפו לעסקאות" },
    { id: "supplier", label: "ספק", icon: Briefcase, desc: "צרו הצעות" },
  ];

  // Unified with Categories: light surface, white controls, soft shadows.
  const fieldWrap = "relative";
  const fieldInput =
    "h-14 w-full rounded-[16px] bg-white pr-12 pl-4 text-[15px] text-[#0A1F3D] placeholder:text-[#9CA3AF] text-right shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.22),0_4px_14px_-4px_rgba(10,31,61,0.12)] focus:outline-none focus:ring-0 transition-all duration-200";

  return (
    <div
      dir="rtl"
      className="auth-screen min-h-[100dvh] w-full flex justify-center text-[#0A1F3D] relative overflow-hidden"
      style={{ background: "#F7F8FA" }}
    >
      {/* Unified light app background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: "#F7F8FA",
          }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-screen-sm flex flex-col px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 28px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        {/* Brand header — minimal, product-focused */}
        <div className="pt-6 pb-2 animate-fade-up flex flex-col items-center text-center">
          <BrandLogo variant="dark" size="xl" className="opacity-100" />
          <h1 className="mt-7 text-[clamp(1.55rem,5.6vw,1.95rem)] font-extrabold leading-tight tracking-tight">
            {mode === "signin" ? "מתחברים לעסקאות טובות יותר" : "בואו נצא לדרך"}
          </h1>
          <div className="mt-3 h-[2px] w-10 rounded-full bg-[#D4AF37]" />
          <p className="mt-3 text-[#6B7280] text-[13px] font-medium leading-relaxed max-w-[22rem]">
            {mode === "signin"
              ? "דיירים וספקים מתחברים לפלטפורמה אחת ויוצרים כוח קנייה שחוסך כסף לכולם"
              : "פתחו חשבון בדקות ספורות והצטרפו לכוח הקנייה של הפרויקט שלכם"}
          </p>
        </div>


        {authError && (
          <div className="mt-3 rounded-[16px] bg-[#FEE2E2] px-4 py-2.5 text-sm text-[#DC2626] leading-relaxed shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
            {authError}
          </div>
        )}

        {/* Forms */}
        <div className="flex-1 flex flex-col justify-center py-3">
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-3.5 animate-fade-up">
              <div className={fieldWrap}>
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="כתובת מייל"
                  dir="rtl"
                  required
                  className={fieldInput}
                />
              </div>
              <div className={fieldWrap}>
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  required
                  minLength={6}
                  dir="rtl"
                  className={cn(fieldInput, "pl-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#C9A961] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-white/70 hover:text-[#C9A961] transition-colors underline-offset-4 hover:underline"
                >
                  שכחתי סיסמה ›
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-fade-up">
              {/* Account type selector with explicit title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[12px] font-semibold tracking-wide text-[#E8C97D] uppercase">בחר סוג חשבון</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {roles.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setRole(id)}
                      className={cn(
                        "p-3 rounded-2xl border text-right transition-all backdrop-blur-md flex items-center gap-3",
                        role === id
                          ? "border-[#D4AF37] bg-[#D4AF37]/15 shadow-[0_0_0_2px_rgba(212,175,55,0.18),0_8px_24px_-12px_rgba(212,175,55,0.6)]"
                          : "border-white/20 bg-white/[0.08] hover:bg-white/[0.12]"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          role === id ? "bg-[#D4AF37] text-[#07172E]" : "bg-white/10 text-white/80"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white leading-tight">{label}</div>
                        <div className="text-[11px] text-white/65 leading-tight mt-0.5">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-gradient-to-l from-transparent via-white/10 to-transparent mt-1" />
              </div>


              <div className={fieldWrap}>
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="שם מלא"
                  required
                  maxLength={60}
                  className={fieldInput}
                />
              </div>

              {role === "resident" && (
                <>
                  <div className={fieldWrap}>
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="עיר"
                      required
                      maxLength={40}
                      className={fieldInput}
                    />
                  </div>
                  <div className={fieldWrap}>
                    <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className={cn(fieldInput, "appearance-none cursor-pointer")}
                      style={{ color: projectId ? "#fff" : "rgba(255,255,255,0.45)" }}
                    >
                      <option value="" style={{ color: "#0A1F3D" }}>פרויקט (אופציונלי)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ color: "#0A1F3D" }}>
                          {p.name} — {p.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {role === "supplier" && (
                <div className={fieldWrap}>
                  <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="שם העסק"
                    required
                    maxLength={80}
                    className={fieldInput}
                  />
                </div>
              )}

              <div className={fieldWrap}>
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="כתובת מייל"
                  dir="rtl"
                  required
                  className={fieldInput}
                />
              </div>

              <div className={fieldWrap}>
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#C9A961]/80 pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה (לפחות 6 תווים)"
                  required
                  minLength={6}
                  dir="rtl"
                  className={cn(fieldInput, "pl-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#C9A961] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>


              <label className="flex items-start gap-2 text-xs text-white/75 cursor-pointer pt-1 px-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#C9A961]"
                />
                <span>
                  קראתי ואני מאשר את{" "}
                  <Link
                    to={role === "supplier" ? "/terms/suppliers" : "/terms/residents"}
                    target="_blank"
                    className="font-bold text-[#E8C97D] underline-offset-2 hover:underline"
                  >
                    תנאי השימוש
                  </Link>
                </span>
              </label>
            </form>
          )}
        </div>

        {/* Primary CTA — rounded square with arrow, not pill */}
        <div className="space-y-4">
          {mode === "signin" ? (
            <Button
              type="button"
              onClick={(e) => handleSignIn(e as unknown as React.FormEvent)}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#B8954A] text-[#0A1F3D] font-bold text-base shadow-[0_14px_44px_-14px_rgba(201,169,97,0.6)] hover:brightness-105 flex items-center justify-center gap-2"
            >
              {loading ? "מתחבר…" : "המשך לחשבון שלי"}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => handleSignUp(e as unknown as React.FormEvent)}
              disabled={loading || !termsAccepted}
              className="w-full h-14 rounded-2xl bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#B8954A] text-[#0A1F3D] font-bold text-base shadow-[0_14px_44px_-14px_rgba(201,169,97,0.6)] hover:brightness-105 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "נרשם…" : "פתחו את החשבון"}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}


          {/* Register prompt — clearly separated below CTA */}
          <div className="text-center text-sm text-white/70">
            {mode === "signin" ? (
              <>
                עדיין אין לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-[#E8C97D] hover:text-[#D4AF37] transition-colors underline-offset-4 hover:underline"
                >
                  הרשמה
                </button>
              </>
            ) : (
              <>
                כבר יש לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-bold text-[#E8C97D] hover:text-[#D4AF37] transition-colors underline-offset-4 hover:underline"
                >
                  התחברות
                </button>
              </>
            )}
          </div>

          {/* Secondary: how it works */}
          <div className="flex items-center justify-center">
            <Link
              to="/about"
              className="flex items-center gap-1.5 text-xs text-white/55 hover:text-[#C9A961] transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              איך זה עובד?

            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

