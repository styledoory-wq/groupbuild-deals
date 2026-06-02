import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Briefcase, Mail, Sparkles, ArrowRight, ArrowLeft, User as UserIcon, MapPin, Lock, Eye, EyeOff, HelpCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // Distinctive input style — rounded-2xl, right-aligned RTL, leading icon on the right,
  // subtle gold focus accent. Deliberately NOT a Blink-style pill with centered placeholder.
  const fieldWrap = "relative";
  const fieldInput =
    "h-14 w-full rounded-2xl bg-white/[0.04] border border-white/15 pr-12 pl-4 text-[15px] text-white placeholder:text-white/45 text-right focus:bg-white/[0.07] focus:border-[#C9A961]/70 focus:shadow-[0_0_0_3px_rgba(201,169,97,0.12)] focus:outline-none focus:ring-0 transition-all duration-200";

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] flex justify-center text-white relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0A1F3D 0%, #0D2748 55%, #07172E 100%)" }}
    >
      {/* Ambient gold orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#C9A961]/12 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-96 w-96 rounded-full bg-[#C9A961]/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#0A1F3D]/40 blur-3xl" />
      </div>

      <div
        className="relative z-10 w-full max-w-screen-sm flex flex-col px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 28px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        {/* Brand header — right-anchored layout (different from Blink's centered logo) */}
        <div className="pt-4 pb-2 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A961]/12 border border-[#C9A961]/30 text-[10.5px] font-medium text-[#E8C97D] mb-3">
                <Sparkles className="h-3 w-3" />
                רכש קבוצתי לבנייה חדשה
              </span>
              <h1 className="text-[clamp(1.625rem,6vw,2.125rem)] font-extrabold leading-[1.05] tracking-tight">
                {mode === "signin" ? (
                  <>
                    שמחים<br />לראותכם שוב.
                  </>
                ) : (
                  <>
                    בואו<br />נצא לדרך.
                  </>
                )}
              </h1>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-[3px] w-8 rounded-full bg-[#C9A961]" />
                <div className="h-[3px] w-3 rounded-full bg-[#C9A961]/40" />
              </div>
            </div>
            <BrandLogo variant="light" size="lg" className="opacity-90 -mt-2" />
          </div>
          <p className="mt-4 text-white/65 text-sm leading-relaxed max-w-[18rem]">
            {mode === "signin"
              ? "התחברו והמשיכו לעסקאות הקבוצתיות של השכונה שלכם."
              : "פתחו חשבון בכמה צעדים — ותתחילו לחסוך עם השכנים."}
          </p>
        </div>

        {authError && (
          <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 leading-relaxed">
            {authError}
          </div>
        )}



        {/* Forms */}
        <div className="flex-1 flex flex-col justify-center py-8">
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 animate-fade-up">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="מייל"
                dir="rtl"
                required
                className={pillInput}
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  required
                  minLength={6}
                  dir="rtl"
                  className={cn(pillInput, "pl-14")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#C9A961] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-white/75 hover:text-[#C9A961] transition-colors"
                >
                  שכחתי את הסיסמה
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-fade-up">
              {/* Role selector */}
              <div className="grid grid-cols-2 gap-2 mb-1">
                {roles.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setRole(id)}
                    className={cn(
                      "p-3 rounded-2xl border-[1.5px] text-center transition-colors backdrop-blur",
                      role === id
                        ? "border-[#C9A961] bg-[#C9A961]/10"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "h-9 w-9 mx-auto rounded-xl flex items-center justify-center mb-1.5",
                        role === id ? "bg-[#C9A961] text-[#0A1F3D]" : "bg-white/10 text-white/70"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="text-[11px] text-white/60 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>

              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="שם מלא"
                required
                maxLength={60}
                className={pillInput}
              />

              {role === "resident" && (
                <>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="עיר"
                    required
                    maxLength={40}
                    className={pillInput}
                  />
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={cn(pillInput, "appearance-none")}
                    style={{ color: projectId ? "#fff" : "rgba(255,255,255,0.55)" }}
                  >
                    <option value="" style={{ color: "#0A1F3D" }}>פרויקט (אופציונלי)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} style={{ color: "#0A1F3D" }}>
                        {p.name} — {p.city}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {role === "supplier" && (
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="שם העסק"
                  required
                  maxLength={80}
                  className={pillInput}
                />
              )}

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="מייל"
                dir="rtl"
                required
                className={pillInput}
              />

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה (לפחות 6 תווים)"
                  required
                  minLength={6}
                  dir="rtl"
                  className={cn(pillInput, "pl-14")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-white/55 hover:text-[#C9A961] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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

        {/* Primary CTA — bottom pill */}
        <div className="space-y-4">
          {mode === "signin" ? (
            <Button
              type="button"
              onClick={(e) => handleSignIn(e as unknown as React.FormEvent)}
              disabled={loading}
              className="w-full h-14 rounded-full bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#B8954A] text-[#0A1F3D] font-bold text-base shadow-[0_14px_44px_-14px_rgba(201,169,97,0.75)] hover:brightness-105"
            >
              {loading ? "מתחבר…" : "כניסה"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => handleSignUp(e as unknown as React.FormEvent)}
              disabled={loading || !termsAccepted}
              className="w-full h-14 rounded-full bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#B8954A] text-[#0A1F3D] font-bold text-base shadow-[0_14px_44px_-14px_rgba(201,169,97,0.75)] hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "נרשם…" : "צרו חשבון"}
            </Button>
          )}

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4 text-sm text-white/75">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="flex items-center gap-1.5 hover:text-[#C9A961] transition-colors"
            >
              {mode === "signin" ? (
                <>
                  <UserIcon className="h-4 w-4" />
                  הרשמה
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  כבר יש לי חשבון
                </>
              )}
            </button>
            <span className="text-white/25">|</span>
            <Link
              to="/about"
              className="flex items-center gap-1.5 hover:text-[#C9A961] transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              עזרה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

