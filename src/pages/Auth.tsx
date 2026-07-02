import { useState, useLayoutEffect, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Briefcase, Mail, ArrowLeft, User as UserIcon, MapPin, Lock, Eye, EyeOff, HelpCircle } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
const groupBuildLogoCropped = { url: "/brand/groupbuild-mark.png" };
import { SupportButton } from "@/components/SupportButton";

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
import { translateAuthError } from "@/lib/authErrors";


type Mode = "signin" | "signup";

export default function Auth({ lockedRole }: { lockedRole?: Exclude<Role, "admin"> } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, projects } = useApp();
  const [role, setRole] = useState<Exclude<Role, "admin">>(lockedRole ?? "resident");
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : (lockedRole ? "signup" : "signin");
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

    // Read intent (may have been set by /suppliers landing or /auth/supplier).
    let intent: string | null = null;
    try { intent = sessionStorage.getItem("gb_intent"); } catch { /* ignore */ }

    // Conflict: user chose supplier flow but already has a completed resident account.
    if (
      intent === "supplier" &&
      resolvedRole === "resident" &&
      (profile as { onboarding_completed?: boolean } | null)?.onboarding_completed
    ) {
      navigate("/onboarding?conflict=resident-vs-supplier");
      return;
    }

    // Intent matches resolved role → clear stale intent.
    if (
      (intent === "supplier" && resolvedRole === "supplier") ||
      (intent === "resident" && resolvedRole === "resident")
    ) {
      try { sessionStorage.removeItem("gb_intent"); } catch { /* ignore */ }
    }

    // New OAuth users (no explicit role chosen) → onboarding picker (intent-aware).
    const needsOnboarding =
      (profile as { onboarding_completed?: boolean } | null)?.onboarding_completed === false &&
      roleNames.length === 0 &&
      !supplierRow?.id;
    if (needsOnboarding) {
      navigate("/onboarding");
      return;
    }

    const redirect = searchParams.get("redirect") ?? searchParams.get("return");
    if (redirect) { navigate(redirect); return; }
    if (resolvedRole === "supplier") navigate("/supplier");
    else navigate("/resident");
  };

  // (translateAuthError moved to src/lib/authErrors.ts)


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Redirect handled by onAuthStateChange
    } catch (err) {
      const raw = err instanceof Error ? err.message : "התחברות נכשלה";
      toast.error(translateAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Persist role intent so onboarding after OAuth callback stays role-locked.
      if (lockedRole === "supplier" || lockedRole === "resident") {
        try { sessionStorage.setItem("gb_intent", lockedRole); } catch { /* ignore */ }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(translateAuthError(error.message ?? "ההתחברות עם Google נכשלה"));
        setLoading(false);
        return;
      }
      // Browser will redirect to Google
    } catch (err) {
      toast.error(err instanceof Error ? translateAuthError(err.message) : "ההתחברות עם Google נכשלה");
      setLoading(false);
    }
  };

  const getSiteOrigin = () => {
    const host = window.location.hostname;
    // Always send confirmation links to the production custom domain,
    // even if the user signs up from the lovable.app preview.
    if (host.endsWith("lovable.app") || host.endsWith("lovable.dev")) {
      return "https://www.groupbuild.co.il";
    }
    return window.location.origin;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("הזינו אימייל ואז לחצו 'שכחתי סיסמה'");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteOrigin()}/reset-password`,
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
      const redirectUrl = `${getSiteOrigin()}/`;
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
      toast.success("נרשמתם בהצלחה! שלחנו לך מייל אישור — בדוק את תיבת הדואר שלך");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "הרשמה נכשלה";
      toast.error(translateAuthError(raw));
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
    "h-[56px] w-full rounded-[14px] bg-white pr-12 pl-4 text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] text-right border border-[#E0E4E8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus:shadow-[0_0_0_3px_rgba(14,107,90,0.22),0_4px_14px_-4px_rgba(10,31,61,0.12)] focus:outline-none focus:ring-0 transition-all duration-200";

  return (
    <div
      dir="rtl"
      className="auth-screen min-h-[100dvh] w-full flex justify-center text-[#1F2937] relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #F7F5F0 0%, #EFEAE0 100%)" }}
    >
      {/* Brand-tinted background — emerald glows + faint logo watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-[0.28]"
          style={{ background: "radial-gradient(circle, #34A88E 0%, transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-24 h-[460px] w-[460px] rounded-full blur-3xl opacity-[0.22]"
          style={{ background: "radial-gradient(circle, #0E6B5A 0%, transparent 65%)" }}
        />
        <BrandMark
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(64vw,460px)] opacity-[0.07] brightness-150 saturate-[0.5] select-none"
        />
      </div>

      <div
        className="relative z-10 w-full max-w-screen-sm flex flex-col px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 28px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        {/* Brand header — clean logo, no badge */}
        <div className="pt-6 pb-2 animate-fade-up flex flex-col items-center text-center">
          <img
            src={groupBuildLogoCropped.url}
            alt="GroupBuild"
            className="h-28 w-auto select-none object-contain"
            draggable={false}
          />
          <h1 className="mt-8 text-[clamp(1.55rem,5.6vw,1.95rem)] font-extrabold leading-tight tracking-tight text-[#0B1220]">
            {mode === "signin" ? "מתחברים לעסקאות טובות יותר" : "בואו נצא לדרך"}
          </h1>
          <div className="mt-3 h-[2px] w-10 rounded-full bg-[#0E6B5A]" />
          <p className="mt-3 text-[#5B6472] text-[13px] font-medium leading-relaxed max-w-[22rem]">
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
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
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
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  required
                  dir="rtl"
                  className={cn(fieldInput, "pl-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors underline-offset-4 hover:underline"
                >
                  שכחתי סיסמה ›
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-fade-up">
              {/* Account type selector with explicit title — hidden when role is locked via route */}
              {!lockedRole && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[12px] font-bold tracking-wide text-[#6B7280] uppercase">בחר סוג חשבון</span>
                  <div className="flex-1 h-px bg-[#ECEEF2]" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {roles.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setRole(id)}
                      className={cn(
                        "p-3 rounded-[16px] text-right transition-all flex items-center gap-3 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] active:scale-[0.97]",
                        role === id
                          ? "bg-[#0E6B5A] text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]"
                          : "bg-white text-[#1F2937]"
                      )}
                    >
                      <div
                        className={cn(
                           "h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0 transition-colors",
                          role === id ? "bg-white/15 text-white" : "bg-[#F4F6FA] text-[#0E6B5A]"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-sm font-bold leading-tight", role === id ? "text-white" : "text-[#1F2937]")}>{label}</div>
                        <div className={cn("text-[11px] leading-tight mt-0.5", role === id ? "text-white/70" : "text-[#6B7280]")}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-[#ECEEF2] mt-1" />
              </div>
              )}


              <div className={fieldWrap}>
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
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
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
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
                    <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className={cn(fieldInput, "appearance-none cursor-pointer")}
                      style={{ color: projectId ? "#1F2937" : "#9CA3AF" }}
                    >
                      <option value="" style={{ color: "#1F2937" }}>פרויקט (אופציונלי)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ color: "#1F2937" }}>
                          {p.name} — {p.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {role === "supplier" && (
                <div className={fieldWrap}>
                  <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
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
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
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
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  required
                  dir="rtl"
                  className={cn(fieldInput, "pl-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>


              <label className="flex items-start gap-2 text-xs text-[#6B7280] cursor-pointer pt-1 px-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#0E6B5A]"
                />
                <span>
                  קראתי ואני מאשר את{" "}
                  <Link
                    to={role === "supplier" ? "/terms/suppliers" : "/terms/residents"}
                    className="font-bold text-[#0A5446] underline-offset-2 hover:underline"
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
              className="w-full h-[56px] rounded-[14px] text-base flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(10,31,61,0.35)]"
            >
              {loading ? "מתחבר…" : "המשך לחשבון שלי"}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => handleSignUp(e as unknown as React.FormEvent)}
              disabled={loading || !termsAccepted}
              className="w-full h-[56px] rounded-[14px] text-base disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(10,31,61,0.35)]"
            >
              {loading ? "נרשם…" : "פתחו את החשבון"}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Divider + Google sign-in */}
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-[#D8DDE3]" />
            <span className="text-xs text-[#6B7280]">או</span>
            <div className="h-px flex-1 bg-[#D8DDE3]" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-[56px] rounded-[14px] bg-white text-[#1F2937] text-[15px] font-semibold flex items-center justify-center gap-3 border border-[#E0E4E8] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.12)] hover:shadow-[0_4px_14px_-4px_rgba(10,31,61,0.18)] transition-all active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5c-.5.4 7-5.1 7-15.1 0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            התחבר עם Google
          </button>



          {/* Register prompt — clearly separated below CTA */}
          <div className="text-center text-sm text-[#6B7280]">
            {mode === "signin" ? (
              <>
                עדיין אין לך חשבון?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-[#0A5446] hover:text-[#0E6B5A] transition-colors underline-offset-4 hover:underline"
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
                  className="font-bold text-[#0A5446] hover:text-[#0E6B5A] transition-colors underline-offset-4 hover:underline"
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
              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              איך זה עובד?

            </Link>
          </div>
        </div>
      </div>
      <div
        className="fixed z-40 top-4 left-4"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <SupportButton />
      </div>
    </div>
  );
}

